// Filter and search placement, one source of truth for each control.
//
// There's a single .shop-filter node and a single search field, and both have
// two homes either side of 1024:
//
//   >1024  rail: the filter is column one of the listing grid, and the search
//          sits at the top of it, so it's anchored to the rail instead of
//          floating in its own row over the products.
//   ≤1024  no rail: the filter moves into the left sheet behind a Filter
//          button, and the search drops back to the .shop__bar row, where it
//          stays visible rather than hiding behind the drawer.
//
// Relocating the same nodes (rather than rendering two copies) is what keeps
// their state — open groups, checked boxes, the typed query — across the move.
// Mirrors the 1025px breakpoint in shop.css. The sheet open/close/focus is
// handled by the generic dialog wiring in app.js.
(function () {
  const filter = document.querySelector(".shop-filter");
  const rail = document.querySelector(".shop__inner");
  const main = document.querySelector(".shop__main");
  const sheetBody = document.querySelector("[data-shop-filter-slot]");
  const search = document.querySelector(".shop__search");
  const bar = document.querySelector(".shop__bar");
  const title = document.querySelector(".shop-filter__title");
  if (!filter || !rail || !main || !sheetBody) return;

  const desktop = window.matchMedia("(min-width: 1025px)");

  const place = () => {
    // Search first: it lives inside .shop-filter on the rail, so pulling it out
    // before the filter moves keeps it from riding along into the sheet.
    if (search && bar && title) {
      if (desktop.matches) {
        if (search.parentElement !== filter) filter.insertBefore(search, title);
      } else if (search.parentElement !== bar) {
        bar.prepend(search);
      }
    }

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
// window, so "Showing 24 of 3" can't happen.
//
// A result that fits on one page has nothing to page, so the whole footer —
// count line and button both — stays out until the set is bigger than a page.
//
// Categories, prices and the recency order come off data attributes rather than
// the visible text: unlike the blog's tag, none of them are printed on the card,
// so there's no second source of truth to drift. The one .shop-filter node is
// relocated between rail and sheet (see above) rather than recreated, so a
// change listener bound to it survives the move.
(function () {
  const PAGE_SIZE = 24;
  const UNDER = 1000; // the "Under 1 000 kr" band in the Price group

  const grid = document.querySelector(".shop__grid");
  const filter = document.querySelector(".shop-filter");
  const empty = document.querySelector(".shop-empty");
  const foot = document.querySelector(".shop__foot");
  const search = document.querySelector("[data-shop-search]");
  const sort = document.querySelector(".shop__sort");
  const more = document.querySelector("[data-shop-more]");
  const countEl = document.querySelector("[data-shop-count]");
  const nouns = document.querySelectorAll("[data-shop-noun]");
  const shownEl = document.querySelector("[data-shop-shown]");
  const totalEl = document.querySelector("[data-shop-total]");
  if (!grid || !filter || !empty || !foot) return;

  // Source order is the "Most popular" order, so capture it before any sort
  // rewrites the DOM.
  const cards = [...grid.querySelectorAll(".shop-card")];
  const popularity = new Map(cards.map((card, i) => [card, i]));

  const num = (card, attr) => Number(card.dataset[attr]) || 0;
  // Name + variant, so a search for a material or a size ("oak", "set of 4")
  // finds the products whose qualifier says so, not just their titles.
  const textOf = (card) => card.querySelector(".shop-card__head")?.textContent || "";

  const SORTS = {
    popular: (a, b) => popularity.get(a) - popularity.get(b),
    newest: (a, b) => num(b, "added") - num(a, "added"),
    oldest: (a, b) => num(a, "added") - num(b, "added"),
    "price-asc": (a, b) => num(a, "price") - num(b, "price"),
    "price-desc": (a, b) => num(b, "price") - num(a, "price")
  };

  let shown = PAGE_SIZE;
  let order = "popular";

  // The checked labels of one filter group, lowercased to match the cards' data
  // attributes. Scoped per group (data-filter on the group body), so adding a
  // group can't quietly widen an existing one's set.
  const checkedIn = (group) =>
    new Set(
      [...filter.querySelectorAll(`[data-filter="${group}"] input[type="checkbox"]`)]
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
    const categories = checkedIn("category");
    const woods = checkedIn("wood");
    const band = priceBand();

    const matches = cards.filter((card) => {
      if (categories.size && !categories.has(card.dataset.category)) return false;
      // Pieces with no wood at all drop out as soon as a wood is asked for.
      if (woods.size && !woods.has(card.dataset.wood)) return false;
      if (band === "under" && num(card, "price") >= UNDER) return false;
      if (query && !`${textOf(card)} ${card.dataset.category}`.toLowerCase().includes(query)) {
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
    // Both counts agree with the size of the result, so a search narrowed to a
    // single hit reads "1 product" / "Showing 1 of 1 product".
    nouns.forEach((n) => {
      n.textContent = matches.length === 1 ? "product" : "products";
    });
    if (shownEl) shownEl.textContent = String(visible);
    if (totalEl) totalEl.textContent = String(matches.length);

    const isEmpty = matches.length === 0;
    empty.hidden = !isEmpty;
    grid.hidden = isEmpty;
    // Nothing to page: one pageful (or less) shows the products alone.
    foot.hidden = matches.length <= PAGE_SIZE;
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
