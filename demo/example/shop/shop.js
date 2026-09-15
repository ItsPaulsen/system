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
// card. The store is the same arrangement, one step further out: the map at the
// bottom of the rail writes the chosen store onto its own group, and this reads
// it back off there (see the store picker at the foot of this file). The one .shop-filter node is relocated between rail and sheet by
// chrome.js rather than recreated, so a change listener bound to it survives
// the move.
(function () {
  const PAGE_SIZE = 24;

  const grid = document.querySelector(".shop__grid");
  const filter = document.querySelector(".shop-filter");
  const empty = document.querySelector(".shop-empty");
  const foot = document.querySelector(".shop__foot");
  const sort = document.querySelector(".ex-sort");
  const more = document.querySelector("[data-shop-more]");
  const chips = document.querySelector(".shop__chips");
  const sheetClear = document.querySelector("[data-ex-filter-clear]");
  const priceSlider = document.querySelector(".shop-price__slider");
  const priceFields = [...document.querySelectorAll("[data-shop-price-field]")];
  const storeGroup = document.querySelector('[data-filter="store"]');
  const counts = document.querySelectorAll("[data-shop-count]");
  const nouns = document.querySelectorAll("[data-shop-noun]");
  const shownEl = document.querySelector("[data-shop-shown]");
  const totalEl = document.querySelector("[data-shop-total]");
  if (!grid || !filter || !empty || !foot) return;

  // Source order is the "Most popular" order, so capture it before any sort
  // rewrites the DOM.
  const cards = [...grid.querySelectorAll(".shop-card")];
  const popularity = new Map(cards.map((card, i) => [card, i]));

  const num = (card, attr) => Number(card.dataset[attr]) || 0;
  // The brand is on the card, so the filter reads it straight off rather than a
  // parallel attribute that could disagree with what's on screen.
  const brandOf = (card) =>
    card.querySelector(".shop-card__brand")?.textContent.trim().toLowerCase() || "";

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

  // The fields are the readout: apply() writes the handle values into them. The
  // one being typed in is left alone, so a change somewhere else in the rail
  // can't rewrite a half-typed number under the cursor.
  const showPrice = ({ min, max }) => {
    priceFields.forEach((field) => {
      if (field === document.activeElement) return;
      field.value = String(field.dataset.shopPriceField === "min" ? min : max);
    });
  };

  // A typed field commits on change (blur or Enter): digits only, empty means
  // the bound it belongs to, and the value is clamped to the bounds and then to
  // the other handle, the clamp-not-swap rule the slider drag uses. The range
  // input snaps what it's handed to its own step, and apply() writes that back,
  // so the field can't end up showing a price the slider isn't on.
  const commitPriceField = (field) => {
    const [lower, upper] = priceInputs();
    if (!lower || !upper) return;
    const { min, max } = priceBounds();
    const isMin = field.dataset.shopPriceField === "min";
    const digits = field.value.replace(/\D/g, "");
    const typed = digits === "" ? (isMin ? min : max) : Number(digits);
    const value = Math.min(max, Math.max(min, typed));
    if (isMin) lower.value = String(Math.min(value, Number(upper.value)));
    else upper.value = String(Math.max(value, Number(lower.value)));
    // Report it the way a drag does, so the slider repaints and the grid follows
    // through the one path.
    lower.dispatchEvent(new Event("input", { bubbles: true }));
  };

  // Put both handles back on the bounds and let the slider repaint itself, so
  // the fill and the fields follow without this file knowing how they work.
  const resetPrice = () => {
    const [lower, upper] = priceInputs();
    const { min, max } = priceBounds();
    if (!lower || !upper) return;
    lower.value = String(min);
    upper.value = String(max);
    lower.dispatchEvent(new Event("input", { bubbles: true }));
  };

  // One predicate for the grid and for the option counts. `skip` drops a facet
  // from the test, which is what a count has to mean: how many products the
  // option would show given what the OTHER facets already allow. Counting with
  // the colour facet included would report 0 for every colour but the checked
  // one, and the numbers would only ever shrink.
  // Read once per pass, not once per card: every getter here sweeps the rail's
  // DOM.
  const facets = () => ({
    categories: checkedIn("category"),
    brands: checkedIn("brand"),
    colors: activeColors(),
    price: priceRange(),
    store: storeGroup?.dataset.store || ""
  });

  const passes = (card, f, skip) => {
    if (skip !== "category" && f.categories.size && !f.categories.has(card.dataset.category)) {
      return false;
    }
    if (skip !== "brand" && f.brands.size && !f.brands.has(brandOf(card))) return false;
    // A piece can be more than one color ("oak cognac"), and matches if any of
    // them is asked for. No color of its own and it drops out.
    if (skip !== "color" && f.colors.size) {
      if (!tokens(card.dataset.color).some((c) => f.colors.has(c))) return false;
    }
    // A product is on the shelf of every store in its list, so the facet is a
    // membership test, not an equality one.
    if (skip !== "store" && f.store && !tokens(card.dataset.stores).includes(f.store)) {
      return false;
    }
    const value = num(card, "price");
    if (skip !== "price" && (value < f.price.min || value > f.price.max)) return false;
    return true;
  };

  // What a single option covers, per group: category and brand match a card on
  // the same value apply() filters by, a colour on its whole family.
  const OPTION_MATCH = {
    category: (card, input) => card.dataset.category === labelOf(input).toLowerCase(),
    brand: (card, input) => brandOf(card) === labelOf(input).toLowerCase(),
    color: (card, input) => {
      const family = new Set(tokens(input.dataset.colors));
      return tokens(card.dataset.color).some((c) => family.has(c));
    }
  };

  // Per-option counts: what each option would show against the rest of the rail,
  // its own group left out of the pool (see passes). An option with nothing
  // behind it is disabled rather than hidden, so the list keeps its length and
  // nothing shifts under the pointer as other filters change.
  const showOptionCounts = (f) => {
    filter.querySelectorAll("[data-filter]").forEach((group) => {
      const match = OPTION_MATCH[group.dataset.filter];
      if (!match) return;
      const pool = cards.filter((card) => passes(card, f, group.dataset.filter));
      group.querySelectorAll(".checkbox").forEach((row) => {
        const out = row.querySelector("[data-shop-option-count]");
        const input = row.querySelector("input");
        if (!out || !input) return;
        const n = pool.filter((c) => match(c, input)).length;
        out.textContent = String(n);
        // Nothing behind the option: put it out of reach, unless it's the one
        // doing the filtering. Disabling a checked option would strand it,
        // leaving the chip as the only way back.
        input.disabled = n === 0 && !input.checked;
      });
    });
  };

  const apply = () => {
    const f = facets();
    const matches = cards.filter((card) => passes(card, f));

    // Sort the full set, not just the matches, so the DOM order stays stable
    // while filters come and go.
    [...cards].sort(SORTS[order]).forEach((card) => grid.append(card));

    const visible = Math.min(shown, matches.length);
    const live = new Set(matches.slice(0, visible));
    cards.forEach((card) => {
      card.hidden = !live.has(card);
    });

    counts.forEach((c) => (c.textContent = String(matches.length)));
    // Both counts agree with the size of the result, so a filter narrowed to a
    // single hit reads "1 product" / "Showing 1 of 1 product".
    nouns.forEach((n) => {
      n.textContent = matches.length === 1 ? "product" : "products";
    });
    showPrice(priceRange());
    showOptionCounts(f);
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

  const storeClear = () => {
    if (!storeGroup?.dataset.store) return null;
    const label = storeGroup.querySelector("[data-shop-store-name]")?.textContent.trim();
    const button = storeGroup.querySelector("[data-shop-store-clear]");
    return label && button ? { label, off: () => button.click() } : null;
  };

  const clearAll = () => {
    filter.querySelectorAll('input[type="checkbox"]').forEach((b) => {
      b.checked = false;
    });
    resetPrice();
    storeClear()?.off();
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
    // The picker owns clearing itself: the map has to reframe and its pins come
    // back, so the chip presses the same button the picker already shows rather
    // than reaching in to undo half of it.
    const store = storeClear();
    if (store) out.push(store);
    return out;
  };

  const renderChips = () => {
    const active = activeFilters();
    // The sheet's own clear says whether there is anything to clear, so it is
    // written from the same pass the chip row is.
    if (sheetClear) sheetClear.disabled = active.length === 0;
    if (!chips) return;
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
      clear.textContent = "Clear filters";
      clear.addEventListener("click", clearAll);
      chips.append(clear);
    }
  };

  filter.addEventListener("change", (e) => {
    // A price field hands its value to the slider, which reports through
    // slider-range:change below; the slider's own native change on release would
    // run the same work a second time.
    if (e.target.matches("[data-shop-price-field]")) {
      commitPriceField(e.target);
      return;
    }
    if (!e.target.matches(".slider-range__input")) reset();
  });

  // Live while dragging: the count and the grid follow the handles.
  filter.addEventListener("slider-range:change", reset);

  // The store picker is a map, not an input, so it reports its own change.
  filter.addEventListener("shop-store:change", reset);
  sort?.addEventListener("select:change", (e) => {
    order = e.detail.option.dataset.sort || "popular";
    reset();
  });

  more?.addEventListener("click", () => {
    shown += PAGE_SIZE;
    apply();
  });

  empty.querySelector("[data-shop-clear]")?.addEventListener("click", clearAll);
  sheetClear?.addEventListener("click", clearAll);

  // Deep link from a product's brand line: ?brand=<label> lands on the listing
  // with that brand already checked. Matched on the label the option shows, which
  // is the same string apply() compares against, so there's no table to keep in
  // step. Its group opens too, so the filter says where the narrowing came from,
  // and apply() below picks it up like any other checked box.
  const wanted = new URLSearchParams(location.search).get("brand")?.toLowerCase();
  if (wanted) {
    const box = [...filter.querySelectorAll('[data-filter="brand"] input[type="checkbox"]')].find(
      (b) => labelOf(b).toLowerCase() === wanted
    );
    if (box) {
      box.checked = true;
      box.closest("details")?.setAttribute("open", "");
    }
  }

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

// The Store facet: a map in the rail, and a store list under it.
//
// The list is the data. Each option carries its own coordinates, so the pins are
// built from the rows the reader can already see, the same way the store finder
// reads its cards. It is also the fallback: the map comes off a CDN, so until
// that script arrives (or if it never does) the list is on screen doing the
// whole job on its own, and the map only replaces it once there is a map.
//
// One store at a time. "In stock at" is a question about one shop you can walk
// into, so picking a second replaces the first rather than widening the set, and
// the selection lives in one place, data-store on the group, which is where
// apply() reads it from.
//
// Leaflet measures its container once, at init, and the group is a collapsed
// <details> animating its own height: init on first open, not on load.
(function () {
  const group = document.querySelector('[data-filter="store"]');
  if (!group) return;

  const mapEl = group.querySelector("[data-shop-store-map]");
  const canvas = group.querySelector(".shop-store__canvas");
  const list = group.querySelector("[data-shop-store-list]");
  const picked = group.querySelector(".shop-store__picked");
  const name = group.querySelector("[data-shop-store-name]");
  const clear = group.querySelector("[data-shop-store-clear]");
  const options = [...group.querySelectorAll(".shop-store__option")];
  if (!options.length) return;

  const latLng = (option) => [Number(option.dataset.lat), Number(option.dataset.lng)];
  const nameOf = (option) => option.querySelector(".shop-store__option-name").textContent.trim();

  // How close a chosen store is framed. A step out from the 14 the store finder
  // uses: that map is the page, this one is 380 tall in a 244 rail, and at 14 it
  // holds a few streets and no sense of where they are.
  const PICKED_ZOOM = 13;

  const markers = new Map();
  let clusters = null;
  let map = null;
  let active = null;

  // Same pin as the store finder, built as a divIcon so it is our markup and our
  // tokens. Rebuilt rather than reclassed: clustering makes and remakes icon
  // elements on its own schedule.
  const icon = (on) =>
    window.L.divIcon({
      className: "",
      html: `<span class="ex-pin${on ? " ex-pin--active" : ""}">
               <span class="ex-pin__dot"></span>
             </span>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  // Every store on screen, centred. The padding is half a pin plus a margin:
  // fitBounds frames the coordinates, and a pin is a 36 disc drawn around its
  // own, so a tight fit cuts the outermost ones in half at the edge.
  const fit = () => {
    if (!map) return;
    const bounds = window.L.latLngBounds(options.map(latLng));
    map.fitBounds(bounds, { padding: [26, 26], animate: false });
  };

  // The chosen store alone while one is chosen, so the map answers "where is
  // this" rather than "where is everything". Membership is touched only where it
  // changes: re-adding a layer rebuilds its icon and blinks the map.
  const syncMarkers = () => {
    if (!markers.size) return;
    options.forEach((option) => {
      const marker = markers.get(option);
      const layer = clusters || map;
      const show = !active || option === active;
      const on = layer.hasLayer(marker);
      if (show && !on) layer.addLayer(marker);
      else if (!show && on) layer.removeLayer(marker);
    });
  };

  const select = (option) => {
    const prev = active;
    active = option;

    if (option) group.dataset.store = option.dataset.store;
    else delete group.dataset.store;
    window.exampleStore?.write(option?.dataset.store || "");

    options.forEach((o) => o.setAttribute("aria-pressed", String(o === option)));
    if (picked) picked.hidden = !option;
    if (name && option) name.textContent = nameOf(option);

    syncMarkers();
    // Only the two that changed, so every other pin keeps the element it has.
    if (prev && prev !== option) markers.get(prev)?.setIcon(icon(false));
    if (option) markers.get(option)?.setIcon(icon(true));

    if (map) {
      if (option) {
        const opts = { animate: !reduced.matches, duration: 0.6 };
        map.flyTo(latLng(option), PICKED_ZOOM, opts);
      } else {
        fit();
      }
    }

    // The grid, the count and the chip row all hang off apply(), so the facet
    // reports its change the way the price slider does and lets the one pass
    // pick it up.
    group.dispatchEvent(new CustomEvent("shop-store:change", { bubbles: true }));
  };

  options.forEach((option) => {
    option.setAttribute("aria-pressed", "false");
    option.addEventListener("click", () => select(option === active ? null : option));
  });

  clear?.addEventListener("click", () => select(null));

  // A store chosen on a product page lands here already filtering. The group
  // stays shut: the chip above the grid is what says where the narrowing came
  // from, and opening a 380 map to repeat it pushes the rest of the rail off the
  // screen. Through select(), so the picked line, the chip and the grid all
  // follow the one path; the map isn't built yet and picks the choice up when it
  // is.
  const remembered = window.exampleStore?.read();
  if (remembered) {
    const option = options.find((o) => o.dataset.store === remembered);
    if (option) select(option);
  }

  const initMap = () => {
    if (map || !window.L || !canvas) return;

    map = window.L.map(canvas, {
      zoomControl: false,

      // No attribution on this one: it is a filter control in a 244 rail, and
      // the line does not fit without taking the map's bottom edge. The store
      // finder is the page that shows the map, and it carries the credit.
      attributionControl: false,
      fadeAnimation: false,
      maxZoom: 20,
      minZoom: 4,

      // The rail scrolls, and a wheel over the map would zoom it instead of
      // reaching the rail. The zoom pair beside it is how this map zooms.
      scrollWheelZoom: false,
      trackResize: false
    });

    // Leaflet is here, so the map is the control: the frame goes up and the list
    // steps aside in the same frame, before anything is painted. Both at once,
    // because a list that shows for the moment the tiles take and then vanishes
    // reads as a glitch, not as a fallback.
    //
    // The frame has to be visible, not merely present, for the tiles to arrive at
    // all: a hidden box is a zero-sized one, and MapLibre renders nothing into it.
    // Until they land it is its own surface.
    mapEl.hidden = false;
    list.hidden = true;
    const ready = window.exampleBasemap(map, canvas);

    clusters = window.L.markerClusterGroup
      ? window.L.markerClusterGroup({
          showCoverageOnHover: false,
          maxClusterRadius: 56,
          animate: false,
          spiderfyOnMaxZoom: false,
          iconCreateFunction: (cluster) =>
            window.L.divIcon({
              className: "",
              html: `<span class="ex-pin ex-pin--cluster">${cluster.getChildCount()}</span>`,
              iconSize: [44, 44],
              iconAnchor: [22, 22]
            })
        }).addTo(map)
      : null;

    options.forEach((option) => {
      const label = nameOf(option);
      const marker = window.L.marker(latLng(option), {
        icon: icon(option === active),
        keyboard: true,
        title: label,
        alt: label
      });
      marker.on("click", () => select(option === active ? null : option));
      markers.set(option, marker);
    });
    syncMarkers();

    const zoom = [...group.querySelectorAll("[data-shop-store-zoom]")];
    const syncZoom = () => {
      const z = map.getZoom();
      zoom.forEach((button) => {
        button.disabled =
          button.dataset.shopStoreZoom === "in"
            ? z >= map.getMaxZoom() - 0.01
            : z <= map.getMinZoom() + 0.01;
      });
    };
    zoom.forEach((button) => {
      button.addEventListener("click", () => {
        map.setZoom(map.getZoom() + (button.dataset.shopStoreZoom === "in" ? 1 : -1));
      });
    });
    map.on("zoomend", syncZoom);
    syncZoom();

    if (active) map.setView(latLng(active), PICKED_ZOOM, { animate: false });
    else fit();

    // If the tiles are taking this long they are not coming: something between
    // here and the basemap is down. Put the list back under the frame so the
    // facet is still usable, and leave the map in place in case it recovers.
    const stalled = setTimeout(() => {
      list.hidden = false;
    }, 5000);
    ready.then(() => {
      clearTimeout(stalled);
      // Tiles are drawn: let the canvas through (see shop.css).
      mapEl.dataset.ready = "";
    });

    // The group animates its own height, so the box Leaflet measured at init is
    // not the box it ends up with: the first fit is against a container still
    // growing, and lands too far in. Refit once the size settles (the basemap's
    // resize watch is what calls invalidateSize), unless a store is chosen, in
    // which case the view is that store and not the set.
    map.on("resize", () => {
      if (!active) fit();
    });
  };

  // First open only. The group animates its own height, so the container Leaflet
  // measures is still growing: the basemap's resize watch answers the settled
  // size a moment later.
  group.closest("details")?.addEventListener("toggle", (e) => {
    if (e.target.open) initMap();
  });
})();
