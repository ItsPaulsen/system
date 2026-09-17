// Search results, assembled from the category listings rather than written here.
//
// A query is asked of the whole shop, so it gets a route of its own rather than
// riding on a category's URL. That leaves the page with no products of its own,
// which is the point: catalogue.js reads them off the category listings, so the
// products stay written in exactly one place and a result can never disagree with
// the page it came from.
//
// What is this page's own is what it does with them: the heading, the band it
// lifts from the listing along with them, and the rail it prunes to fit.
(function () {
  const placeholder = document.querySelector("[data-results-band]");
  if (!placeholder) return;

  const BEST = 6; // how many the shelf shows when nothing matched

  const title = document.querySelector("[data-results-title]");
  const sub = document.querySelector("[data-results-sub]");
  const field = document.querySelector("[data-results-field]");
  const suggested = document.querySelector("[data-results-suggested]");
  const shelf = document.querySelector("[data-results-shelf]");

  // The field is filled by the page's own inline script, before the first paint.
  const query = (field?.value || new URLSearchParams(location.search).get("q") || "")
    .trim()
    .toLowerCase();

  const { load, match, textOf, tokens } = window.exampleCatalogue;

  const brandOf = (card) =>
    card.querySelector(".shop-card__brand")?.textContent.trim().toLowerCase() || "";

  // The rail arrives describing the whole catalogue, and this page is not the
  // whole catalogue. Two passes over it:
  //
  // An option with nothing behind it goes. On the listing those are disabled
  // rather than removed, so the list keeps its length and nothing shifts under
  // the pointer while the reader ticks things; here the set was decided before
  // the reader arrived, and a column of greyed-out options is a page telling them
  // what they cannot have.
  //
  // So does an option every result already satisfies, which is the same thing
  // from the other end: it cannot narrow anything. That covers the search itself
  // (every result of "tree" is a Tree) and the searches that imply it (so is every
  // result of "oak"), without either being a case. And where it does not hold it
  // keeps the option: search "tree" in a shop that sells a Tree Chair in black and
  // Tree still has work to do.
  // The price range is the catalogue's, and this page is a slice of it: a slider
  // running to 56 000 when the dearest result is 13 000 spends most of its travel
  // on nothing. Rounded outward to the slider's own step, so both handles can
  // still reach the ends. One product, or several at one price, and the group
  // goes: there is no range to set.
  const priceTo = (band, hits) => {
    const slider = band.querySelector(".shop-price__slider");
    const group = band.querySelector(".shop-price")?.closest("details");
    if (!slider || !group) return;

    const prices = hits.map((card) => Number(card.dataset.price) || 0).filter(Boolean);
    const inputs = [...slider.querySelectorAll(".slider-range__input")];
    const step = Number(inputs[0]?.step) || 1;
    const low = Math.floor(Math.min(...prices) / step) * step;
    const high = Math.ceil(Math.max(...prices) / step) * step;

    if (prices.length < 2 || low === high) {
      group.remove();
      return;
    }

    // Attributes, not properties: the band is still detached here and is brought
    // over with importNode, which copies attributes and nothing else. A value set
    // as a property would be left behind on the copy.
    inputs.forEach((input, i) => {
      input.setAttribute("min", String(low));
      input.setAttribute("max", String(high));
      input.setAttribute("value", String(i === 0 ? low : high));
    });
    band.querySelectorAll("[data-shop-price-field]").forEach((field) => {
      field.setAttribute("value", String(field.dataset.shopPriceField === "min" ? low : high));
    });
  };

  const prune = (band, hits) => {
    priceTo(band, hits);
    band.querySelectorAll("[data-filter]").forEach((group) => {
      const kind = group.dataset.filter;
      group.querySelectorAll(".checkbox").forEach((row) => {
        const input = row.querySelector("input");
        const label = row.querySelector(".checkbox__label")?.textContent.trim().toLowerCase() || "";
        const covers = tokens(input?.dataset.colors);
        const holds = (card) => {
          if (kind === "brand") return brandOf(card) === label;
          if (kind === "category") return (card.dataset.category || "") === label;
          if (kind === "color") return tokens(card.dataset.color).some((c) => covers.includes(c));
          return true;
        };
        if (!hits.some(holds) || hits.every(holds)) row.remove();
      });

      // The store facet is a list of buttons rather than checkboxes, and the same
      // rule applies: a shop holding none of these results is not a way through
      // them.
      group.querySelectorAll(".shop-store__option").forEach((option) => {
        const slug = option.dataset.store;
        if (!hits.some((card) => tokens(card.dataset.stores).includes(slug))) {
          option.closest("li")?.remove();
        }
      });

      // A group with one option left cannot narrow anything either: every result
      // is already that one. Nothing left at all and the group goes with it.
      const left =
        kind === "store"
          ? group.querySelectorAll(".shop-store__option").length
          : group.querySelectorAll(".checkbox").length;
      if (left <= 1) group.closest("details")?.remove();
    });

    // One result cannot be sorted, and by now it has nothing left to filter by
    // either, so the rail and the button that opens it go with the sort. What is
    // left in the toolbar is the count, which still has something to say.
    if (hits.length < 2) band.querySelector(".ex-sort")?.remove();
    // Nothing left to filter by. The rail is hidden rather than removed: shop.js
    // takes it as a sign the page is a listing at all and does nothing without
    // one, and a page with no rail is exactly the page that still needs its
    // counts and its paging.
    if (!band.querySelector(".ex-filter__group")) {
      band.querySelector(".ex-filter")?.classList.add("ex-filter--empty");
      band.querySelector(".ex-filter-toggle")?.remove();
      band.querySelector(".shop__inner")?.classList.add("shop__inner--alone");
    }
  };

  const hydrate = (doc, hits) => {
    const band = doc.querySelector(".shop");
    if (!band) return false;

    const into = band.querySelector(".shop__grid");
    const keep = new Set(hits.map((c) => c.getAttribute("href") + c.textContent));
    into?.querySelectorAll(".shop-card").forEach((card) => {
      if (!keep.has(card.getAttribute("href") + card.textContent)) card.remove();
    });
    prune(band, hits);

    placeholder.replaceWith(document.importNode(band, true));

    // The scripts that hydrate this markup all ran while the page was still a
    // placeholder, so the parts of them that matter here are run again over what
    // has just arrived. Each is global and each only wires what it finds, and
    // this page has none of these components of its own to wire twice.
    ["initScrollAreas", "initSliderRanges", "initSelects", "initDialogs"].forEach((fn) => {
      if (typeof window[fn] === "function") window[fn]();
    });
    window.exampleFilterPlacement?.();

    // Last, because it reads the rail and the grid it has just been given.
    const tag = document.createElement("script");
    tag.src = "/demo/example/shop/shop.js";
    document.body.append(tag);
    return true;
  };

  const say = (n) => {
    if (title) {
      title.textContent = !query
        ? "Search"
        : n === 0
          ? `No match for \u201c${query}\u201d`
          : `${n} ${n === 1 ? "product" : "products"} for \u201c${query}\u201d`;
    }
    if (sub) sub.hidden = !query || n > 0;
  };

  load().then(({ doc, cards, families }) => {
    const hits = query ? cards.filter((card) => match(textOf(card, families), query)) : cards;
    say(hits.length);

    // Nothing matched: no band at all, since a rail that can only narrow nothing
    // is a row of controls with no work to do. The shelf takes the page instead.
    if (!hits.length) {
      placeholder.hidden = true;
      if (suggested) suggested.hidden = false;
      if (shelf) {
        shelf.replaceChildren(
          ...cards.slice(0, BEST).map((card) => document.importNode(card, true))
        );
        // shelf.js wired this row while it was empty, so it has measured nothing
        // to scroll. One resize is all it needs to look again.
        dispatchEvent(new Event("resize"));
      }
      return;
    }

    hydrate(doc, hits);
  });
})();
