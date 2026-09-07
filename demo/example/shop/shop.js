// Shop filter placement, one source of truth for the filter UI.
//
// There's a single .shop-filter node. Above 1024 it sits in the listing grid as
// the left rail; at/below 1024 the rail is replaced by a Filter button and the
// same node is relocated into the left sheet, so its state (open groups, checked
// boxes, chosen price) survives the move. Mirrors the 1025px breakpoint in
// shop.css. The sheet open/close/focus is handled by the generic dialog wiring
// in app.js. Same arrangement as the blog listing.
(function () {
  const filter = document.querySelector(".shop-filter");
  const rail = document.querySelector(".shop__inner");
  const main = document.querySelector(".shop__main");
  const sheetBody = document.querySelector("[data-shop-filter-slot]");
  if (!filter || !rail || !main || !sheetBody) return;

  const desktop = window.matchMedia("(min-width: 1025px)");

  const place = () => {
    if (desktop.matches) {
      // Rail: filter returns to the grid, ahead of the products column.
      if (filter.parentElement !== rail) rail.insertBefore(filter, main);
    } else if (filter.parentElement !== sheetBody) {
      // Drawer: filter lives inside the sheet body.
      sheetBody.append(filter);
    }
  };

  place();
  desktop.addEventListener("change", place);
})();

// Search, filter, sort and paging over the products already in the markup.
//
// One apply() owns the whole result set: it narrows the cards to the ones
// matching the search text, the price band and the checked categories, orders
// that set by the sort control, then reveals the first PAGE_SIZE of them and
// lets Show more extend the window. Anything that changes the set resets the
// window, so "Showing 10 of 3" can't happen.
//
// Categories, prices and the recency order come off data attributes rather than
// the visible text: unlike the blog's tag, none of them are printed on the card,
// so there's no second source of truth to drift. The one .shop-filter node is
// relocated between rail and sheet (see above) rather than recreated, so a
// change listener bound to it survives the move.
(function () {
  const PAGE_SIZE = 10;
  const UNDER = 1000; // the "Under 1 000 kr" band in the Price group

  const grid = document.querySelector(".shop__grid");
  const filter = document.querySelector(".shop-filter");
  const empty = document.querySelector(".shop-empty");
  const foot = document.querySelector(".shop__foot");
  const search = document.querySelector("[data-shop-search]");
  const sort = document.querySelector(".shop__sort");
  const more = document.querySelector("[data-shop-more]");
  const countEl = document.querySelector("[data-shop-count]");
  const shownEl = document.querySelector("[data-shop-shown]");
  const totalEl = document.querySelector("[data-shop-total]");
  if (!grid || !filter || !empty || !foot) return;

  // Source order is the "Most popular" order, so capture it before any sort
  // rewrites the DOM.
  const cards = [...grid.querySelectorAll(".shop-card")];
  const popularity = new Map(cards.map((card, i) => [card, i]));

  const num = (card, attr) => Number(card.dataset[attr]) || 0;
  const titleOf = (card) => card.querySelector(".shop-card__title")?.textContent.trim() || "";

  const SORTS = {
    popular: (a, b) => popularity.get(a) - popularity.get(b),
    newest: (a, b) => num(b, "added") - num(a, "added"),
    "price-asc": (a, b) => num(a, "price") - num(b, "price"),
    "price-desc": (a, b) => num(b, "price") - num(a, "price")
  };

  let shown = PAGE_SIZE;
  let order = "popular";

  const activeCategories = () =>
    new Set(
      [...filter.querySelectorAll('input[type="checkbox"]')]
        .filter((b) => b.checked)
        .map((b) =>
          b
            .closest(".checkbox")
            ?.querySelector(".checkbox__label")
            ?.textContent.trim()
            .toLowerCase()
        )
    );

  const priceBand = () => filter.querySelector('input[name="shop-price"]:checked')?.value || "any";

  const apply = () => {
    const query = (search?.value || "").trim().toLowerCase();
    const categories = activeCategories();
    const band = priceBand();

    const matches = cards.filter((card) => {
      if (categories.size && !categories.has(card.dataset.category)) return false;
      if (band === "under" && num(card, "price") >= UNDER) return false;
      if (query && !`${titleOf(card)} ${card.dataset.category}`.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });

    // Sort the full set, not just the matches, so the DOM order stays stable
    // while filters come and go.
    [...cards].sort(SORTS[order]).forEach((card) => grid.append(card));

    const visible = Math.min(shown, matches.length);
    const live = new Set(matches.slice(0, visible));
    cards.forEach((card) => {
      card.hidden = !live.has(card);
    });

    if (countEl) countEl.textContent = String(matches.length);
    if (shownEl) shownEl.textContent = String(visible);
    if (totalEl) totalEl.textContent = String(matches.length);

    const isEmpty = matches.length === 0;
    empty.hidden = !isEmpty;
    grid.hidden = isEmpty;
    foot.hidden = isEmpty;
    if (more) more.hidden = visible >= matches.length;
  };

  // Any change to the set starts the window over: the first page of the new
  // result is what the reader wants to see, not page three of the old one.
  const reset = () => {
    shown = PAGE_SIZE;
    apply();
  };

  filter.addEventListener("change", reset);

  // Typing is debounced: the count is a live region, so re-running apply() on
  // every keystroke would queue an announcement per character.
  let typing;
  search?.addEventListener("input", () => {
    clearTimeout(typing);
    typing = setTimeout(reset, 200);
  });
  sort?.addEventListener("select:change", (e) => {
    order = e.detail.option.dataset.sort || "popular";
    reset();
  });

  more?.addEventListener("click", () => {
    shown += PAGE_SIZE;
    apply();
  });

  empty.querySelector("[data-shop-clear]")?.addEventListener("click", () => {
    filter.querySelectorAll('input[type="checkbox"]').forEach((b) => {
      b.checked = false;
    });
    const any = filter.querySelector('input[name="shop-price"][value="any"]');
    if (any) any.checked = true;
    if (search) search.value = "";
    reset();
  });

  apply();
})();
