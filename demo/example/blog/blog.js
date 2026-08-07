// Blog filter placement — one source of truth for the filter UI.
//
// There's a single .blog-filter node. Above 1024 it sits in the listing grid as
// the left rail; at/below 1024 the rail is replaced by a Filter button and the
// same node is relocated into the left sheet, so its state (open groups, checked
// boxes) survives the move. Mirrors the 1025px breakpoint in blog.css. The sheet
// open/close/focus is handled by the generic dialog wiring in app.js.
(function () {
  const filter = document.querySelector(".blog-filter");
  const rail = document.querySelector(".blog__inner");
  const main = document.querySelector(".blog__main");
  const sheetBody = document.querySelector("[data-blog-filter-slot]");
  if (!filter || !rail || !main || !sheetBody) return;

  const desktop = window.matchMedia("(min-width: 1025px)");

  const place = () => {
    if (desktop.matches) {
      // Rail: filter returns to the grid, ahead of the posts column.
      if (filter.parentElement !== rail) rail.insertBefore(filter, main);
    } else if (filter.parentElement !== sheetBody) {
      // Drawer: filter lives inside the sheet body.
      sheetBody.append(filter);
    }
  };

  place();
  desktop.addEventListener("change", place);
})();

// Category filter — checking one or more Category boxes narrows the grid to
// posts whose tag matches; with none checked, everything shows. When nothing
// matches, the grid gives way to the empty state, whose "Clear all filters"
// button unchecks every box and restores the full grid. Pagination is a
// full-listing affordance, so it shows only when every post is visible and
// hides the moment a filter narrows the set (a partial demo set isn't paged).
//
// Categories are read from the visible label / tag text, so there's no second
// source of truth to keep in sync with the markup. The one .blog-filter node is
// relocated between rail and sheet (see above) rather than recreated, so a
// change listener bound to it survives the move.
(function () {
  const filter = document.querySelector(".blog-filter");
  const grid = document.querySelector(".blog__grid");
  const empty = document.querySelector(".blog-empty");
  const pagination = document.querySelector(".blog__pagination");
  if (!filter || !grid || !empty) return;

  const boxes = [...filter.querySelectorAll('input[type="checkbox"]')];
  const cards = [...grid.querySelectorAll(".blog-card")];

  const labelOf = (box) =>
    box.closest(".checkbox")?.querySelector(".checkbox__label")?.textContent.trim().toLowerCase();
  const categoryOf = (card) =>
    card.querySelector(".blog-card__tag")?.textContent.trim().toLowerCase();

  const apply = () => {
    const active = new Set(boxes.filter((b) => b.checked).map(labelOf));
    let shown = 0;
    cards.forEach((card) => {
      const match = active.size === 0 || active.has(categoryOf(card));
      card.hidden = !match;
      if (match) shown += 1;
    });

    const isEmpty = shown === 0;
    empty.hidden = !isEmpty;
    grid.hidden = isEmpty;
    // Only page the complete listing; any active filter (shown < total) hides it.
    if (pagination) pagination.hidden = shown < cards.length;
  };

  filter.addEventListener("change", (e) => {
    if (e.target.matches('input[type="checkbox"]')) apply();
  });

  empty.querySelector("[data-blog-clear]")?.addEventListener("click", () => {
    boxes.forEach((b) => {
      b.checked = false;
    });
    apply();
  });
})();
