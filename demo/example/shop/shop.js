// Filter placement, one source of truth for the filter UI.
//
// There's a single .shop-filter node. Above 1024 it sits in the listing grid as
// the left rail; at/below 1024 the rail is replaced by a Filter button in the
// toolbar and the same node is relocated into the left sheet, so its state
// (open groups, checked boxes, price range) survives the move. Mirrors the
// 1025px breakpoint in shop.css. The sheet open/close/focus is handled by the
// generic dialog wiring in app.js. Same arrangement as the blog listing.
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
// matching the price range, the checked categories, brands and colors, orders
// that set by the sort control, then reveals the first PAGE_SIZE of them and
// lets Show more extend the window. Anything that changes the set resets the
// window, so "Showing 24 of 3" can't happen.
//
// A result that fits on one page has nothing to page, so the whole footer,
// count line and button both, stays out until the set is bigger than a page.
//
// Each facet reads from wherever it already lives, so nothing is stored twice:
// the brand off the card's own title (it *is* the brand), the category, colors,
// price and recency off data attributes, since none of those are printed on the
// card. The one .shop-filter node is relocated between rail and sheet (see
// above) rather than recreated, so a change listener bound to it survives the
// move.
(function () {
  const PAGE_SIZE = 24;

  const grid = document.querySelector(".shop__grid");
  const filter = document.querySelector(".shop-filter");
  const empty = document.querySelector(".shop-empty");
  const foot = document.querySelector(".shop__foot");
  const sort = document.querySelector(".ex-sort");
  const more = document.querySelector("[data-shop-more]");
  const chips = document.querySelector(".shop__chips");
  const priceSlider = document.querySelector(".shop-price__slider");
  const priceValue = document.querySelector("[data-shop-price-value]");
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
  // The title is the brand, so the brand filter reads it straight off the card
  // rather than a parallel attribute that could disagree with what's on screen.
  const brandOf = (card) =>
    card.querySelector(".shop-card__title")?.textContent.trim().toLowerCase() || "";

  const SORTS = {
    popular: (a, b) => popularity.get(a) - popularity.get(b),
    newest: (a, b) => num(b, "added") - num(a, "added"),
    oldest: (a, b) => num(a, "added") - num(b, "added"),
    "price-asc": (a, b) => num(a, "price") - num(b, "price"),
    "price-desc": (a, b) => num(b, "price") - num(a, "price")
  };

  let shown = PAGE_SIZE;
  let order = "popular";

  // A space-separated attribute read as a set of tokens, used for both a
  // checkbox's data-colors and a card's data-color.
  const tokens = (value) => (value || "").split(/\s+/).filter(Boolean);

  // Scoped per group (data-filter on the group body), so adding a group can't
  // quietly widen an existing one's set.
  const checkedBoxes = (group) => [
    ...filter.querySelectorAll(`[data-filter="${group}"] input[type="checkbox"]:checked`)
  ];

  const labelOf = (input) =>
    input.closest(".checkbox")?.querySelector(".checkbox__label")?.textContent.trim() || "";

  // Group labels, lowercased to match the cards' data attributes.
  const checkedIn = (group) => new Set(checkedBoxes(group).map((b) => labelOf(b).toLowerCase()));

  // Color options are families, not single values: each checkbox declares the
  // colors it covers in data-colors (Tree covers every wood), so a checked box
  // contributes its whole set. Keeping that list in the markup means adding a
  // wood is one word beside the label, with no table here to keep in step.
  const activeColors = () =>
    new Set(checkedBoxes("color").flatMap((b) => tokens(b.dataset.colors)));

  // Price range. The slider's own min/max are the bounds, so "both handles at
  // the ends" is the off state and nothing here has to know the catalogue's
  // prices: widening the range is one attribute in the markup.
  const priceInputs = () => [...(priceSlider?.querySelectorAll(".slider-range__input") || [])];
  const priceBounds = () => {
    const [lower] = priceInputs();
    return { min: Number(lower?.min || 0), max: Number(lower?.max || 0) };
  };
  const priceRange = () => {
    const [lower, upper] = priceInputs();
    if (!lower || !upper) return priceBounds();
    return { min: Number(lower.value), max: Number(upper.value) };
  };
  const kr = (v) => `${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} kr`;

  // Put both handles back on the bounds and let the slider repaint itself, so
  // the fill and the readout follow without this file knowing how they work.
  const resetPrice = () => {
    const [lower, upper] = priceInputs();
    const { min, max } = priceBounds();
    if (!lower || !upper) return;
    lower.value = String(min);
    upper.value = String(max);
    lower.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const apply = () => {
    const categories = checkedIn("category");
    const brands = checkedIn("brand");
    const colors = activeColors();
    const price = priceRange();

    const matches = cards.filter((card) => {
      if (categories.size && !categories.has(card.dataset.category)) return false;
      if (brands.size && !brands.has(brandOf(card))) return false;
      // A piece can be more than one color ("oak cognac"), and matches if any of
      // them is asked for. No color of its own and it drops out.
      if (colors.size && !tokens(card.dataset.color).some((c) => colors.has(c))) return false;
      const value = num(card, "price");
      if (value < price.min || value > price.max) return false;
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
    // Both counts agree with the size of the result, so a filter narrowed to a
    // single hit reads "1 product" / "Showing 1 of 1 product".
    nouns.forEach((n) => {
      n.textContent = matches.length === 1 ? "product" : "products";
    });
    if (priceValue) priceValue.textContent = `${kr(price.min)} - ${kr(price.max)}`;
    if (shownEl) shownEl.textContent = String(visible);
    if (totalEl) totalEl.textContent = String(matches.length);

    renderChips();

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

  const clearAll = () => {
    filter.querySelectorAll('input[type="checkbox"]').forEach((b) => {
      b.checked = false;
    });
    resetPrice();
    reset();
  };

  // The chip row is a view of the rail, rebuilt from it on every apply(), so the
  // two can't drift. Each chip owns the input it came from and unchecks it; the
  // price chip puts both handles back on the bounds, its off state.
  const X_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>';

  const activeFilters = () => {
    const out = [];
    filter.querySelectorAll('input[type="checkbox"]:checked').forEach((input) => {
      const label = labelOf(input);
      if (label) out.push({ label, off: () => (input.checked = false) });
    });
    const price = priceRange();
    const bounds = priceBounds();
    if (price.min !== bounds.min || price.max !== bounds.max) {
      out.push({ label: `${kr(price.min)} - ${kr(price.max)}`, off: resetPrice });
    }
    return out;
  };

  const renderChips = () => {
    if (!chips) return;
    const active = activeFilters();
    chips.hidden = active.length === 0;
    chips.textContent = "";
    active.forEach(({ label, off }) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip shop-chip";
      chip.innerHTML = X_ICON;
      chip.prepend(label);
      chip.setAttribute("aria-label", `Remove filter: ${label}`);
      chip.addEventListener("click", () => {
        off();
        reset();
      });
      chips.append(chip);
    });
    if (active.length) {
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "link shop__chips-clear";
      clear.textContent = "Clear all filters";
      clear.addEventListener("click", clearAll);
      chips.append(clear);
    }
  };

  filter.addEventListener("change", (e) => {
    // The slider reports through slider-range:change below; its native change
    // on release would run the same work a second time.
    if (!e.target.matches(".slider-range__input")) reset();
  });

  // Live while dragging: the count and the grid follow the handles.
  filter.addEventListener("slider-range:change", reset);
  sort?.addEventListener("select:change", (e) => {
    order = e.detail.option.dataset.sort || "popular";
    reset();
  });

  more?.addEventListener("click", () => {
    shown += PAGE_SIZE;
    apply();
  });

  empty.querySelector("[data-shop-clear]")?.addEventListener("click", clearAll);

  apply();
})();

// Long filter groups: find-as-you-type plus a capped list.
//
// A group marked [data-filter-long] shows at most VISIBLE options and offers
// "Show all (n)" to reveal the rest; its own search field narrows the options by
// label. Both affordances stay hidden while the group is short enough not to
// need them, so a group grows into the behaviour instead of being built twice.
//
// This is about *finding a filter*, not filtering products, so it never touches
// apply(): hiding an option leaves it checked, and a checked option always shows
// so it can be unchecked again.
(function () {
  const VISIBLE = 6;
  const groups = document.querySelectorAll("[data-filter-long]");

  groups.forEach((group) => {
    const boxes = [...group.querySelectorAll(".checkbox")];
    const search = group.querySelector('input[type="search"]');
    const more = group.querySelector(".ex-filter__more");
    const field = group.querySelector(".ex-filter__search");
    let expanded = false;

    const labelOf = (box) =>
      box.querySelector(".checkbox__label")?.textContent.trim().toLowerCase() || "";

    const render = () => {
      const query = (search?.value || "").trim().toLowerCase();
      const matches = boxes.filter((b) => labelOf(b).includes(query));
      // A checked option is never hidden by the cap: it has to stay reachable to
      // be turned off.
      const cap = expanded || query ? matches.length : VISIBLE;
      let shown = 0;
      matches.forEach((b) => {
        const checked = b.querySelector("input")?.checked;
        const within = shown < cap;
        b.hidden = !(within || checked);
        if (within) shown += 1;
      });
      boxes
        .filter((b) => !matches.includes(b))
        .forEach((b) => {
          b.hidden = !b.querySelector("input")?.checked;
        });

      const hidden = matches.length - Math.min(cap, matches.length);
      if (more) {
        more.hidden = hidden <= 0;
        more.textContent = `Show all (${matches.length})`;
      }
      // Nothing to search through until the list outgrows the cap.
      if (field) field.hidden = boxes.length <= VISIBLE;
    };

    search?.addEventListener("input", render);
    group.addEventListener("change", render);
    more?.addEventListener("click", () => {
      expanded = true;
      render();
    });
    render();
  });
})();
