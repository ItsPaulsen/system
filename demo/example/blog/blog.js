// Blog filter placement, one source of truth for the filter UI.
//
// There's a single .blog-filter node. Above 1024 it sits in the listing grid as
// the left rail; below 1024 the rail is replaced by a Filter button and the
// same node is relocated into the left sheet, so its state (open groups, checked
// boxes) survives the move. Mirrors the 1024px breakpoint in blog.css. The sheet
// open/close/focus is handled by the generic dialog wiring in app.js.
(function () {
  const filter = document.querySelector(".blog-filter");
  const rail = document.querySelector(".blog__inner");
  const main = document.querySelector(".blog__main");
  const sheetBody = document.querySelector("[data-blog-filter-slot]");
  if (!filter || !rail || !main || !sheetBody) return;

  const desktop = window.matchMedia("(min-width: 1024px)");

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

// Category filter and sort, plus the count that reports the result.
//
// Checking one or more Category boxes narrows the grid to posts whose tag
// matches; with none checked, everything shows. The Reading time band narrows on
// data-minutes alongside it, both having to pass. When nothing matches, the grid
// gives way to the empty state, whose "Clear all filters" button unchecks every
// box and restores the full grid. Pagination is a full-listing affordance, so it
// shows only when every post is visible and hides the moment a filter narrows
// the set (a partial demo set isn't paged).
//
// Categories are read from the visible tag text, so there's no second source of
// truth to keep in sync with the markup; the date is the one thing that isn't on
// screen in a sortable form, so it lives in data-date. The one .blog-filter node
// is relocated between rail and sheet (see above) rather than recreated, so a
// change listener bound to it survives the move.
(function () {
  const filter = document.querySelector(".blog-filter");
  const grid = document.querySelector(".blog__grid");
  const empty = document.querySelector(".blog-empty");
  const pagination = document.querySelector(".blog__pagination");
  const sort = document.querySelector(".ex-sort");
  const countEl = document.querySelector("[data-blog-count]");
  const nouns = document.querySelectorAll("[data-blog-noun]");
  if (!filter || !grid || !empty) return;

  // The Reading time split: under 5 goes to "Under 5 min", 5 and up to
  // "Over 5 min", which is where an exactly-5-minute post lands.
  const SHORT = 5;

  const boxes = [...filter.querySelectorAll('input[type="checkbox"]')];
  const cards = [...grid.querySelectorAll(".blog-card")];

  const labelOf = (box) =>
    box.closest(".checkbox")?.querySelector(".checkbox__label")?.textContent.trim().toLowerCase();
  const categoryOf = (card) =>
    card.querySelector(".blog-card__tag")?.textContent.trim().toLowerCase();
  // ISO dates, so a string compare is a date compare.
  const dateOf = (card) => card.dataset.date || "";
  const minutesOf = (card) => Number(card.dataset.minutes) || 0;
  const readBand = () => filter.querySelector('input[name="blog-read"]:checked')?.value || "any";

  const SORTS = {
    newest: (a, b) => dateOf(b).localeCompare(dateOf(a)),
    oldest: (a, b) => dateOf(a).localeCompare(dateOf(b))
  };
  let order = "newest";

  const apply = () => {
    const active = new Set(boxes.filter((b) => b.checked).map(labelOf));
    const band = readBand();
    let shown = 0;
    cards.forEach((card) => {
      const match =
        (active.size === 0 || active.has(categoryOf(card))) &&
        (band === "any" || (band === "short" ? minutesOf(card) < SHORT : minutesOf(card) >= SHORT));
      card.hidden = !match;
      if (match) shown += 1;
    });

    // Sort the full set, not just the matches, so the DOM order stays stable
    // while filters come and go.
    [...cards].sort(SORTS[order]).forEach((card) => grid.append(card));

    if (countEl) countEl.textContent = String(shown);
    nouns.forEach((n) => {
      n.textContent = shown === 1 ? "post" : "posts";
    });

    const isEmpty = shown === 0;
    empty.hidden = !isEmpty;
    grid.hidden = isEmpty;
    // Only page the complete listing; any active filter (shown < total) hides it.
    if (pagination) pagination.hidden = shown < cards.length;
  };

  filter.addEventListener("change", apply);

  sort?.addEventListener("select:change", (e) => {
    order = e.detail.option.dataset.sort || "newest";
    apply();
  });

  empty.querySelector("[data-blog-clear]")?.addEventListener("click", () => {
    boxes.forEach((b) => {
      b.checked = false;
    });
    const any = filter.querySelector('input[name="blog-read"][value="any"]');
    if (any) any.checked = true;
    apply();
  });

  apply();
})();
