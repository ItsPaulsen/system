// The shop's search field and the panel under it.
//
// Two states, and they answer different questions. Empty, the panel is a way in
// for a reader with nothing typed: what they opened last, what they looked for
// last, and what everyone looks for. Typing, it is a shortcut: the words that
// would find something, then the products themselves, with their shots, since a
// chair is recognised before its name is read.
//
// The products are the cards already on the page, read out of the shelves rather
// than kept in a list of their own: the landing shows what it shows, and the
// panel suggests from exactly that. A category with its own shelf joins the pool
// by existing. The words come from the same place, the brands and the family
// names off those cards, so there is no vocabulary here to keep in step with the
// catalogue.
//
// Everything in the panel is an option, including the row that clears the recent
// searches. One list, one keyboard model: arrows move, Enter takes, Escape
// closes, and a press does the same as Enter.
(function () {
  const form = document.querySelector("[data-shop-search]");
  if (!form) return;

  const input = form.querySelector(".input__element");
  const panel = form.querySelector("[data-shop-search-panel]");
  // Above the list rather than in it: it acts on the history rather than being
  // one of the things in it, so it is not somewhere the arrows should stop.
  const scrim = form.querySelector("[data-shop-search-scrim]");
  const closer = form.querySelector("[data-shop-search-close]");
  // Below this the open panel is the screen rather than a card on it, which is
  // the one state the page behind has to stop scrolling in. Mirrors the
  // breakpoint the layout uses (see shop.css).
  const phone = matchMedia("(max-width: 767.98px)");
  const wipe = form.querySelector("[data-shop-search-wipe]");
  const bar = form.querySelector("[data-shop-search-bar]");
  const clear = form.querySelector("[data-shop-search-clear]");
  const list = form.querySelector("[data-shop-search-list]");
  if (!input || !panel || !list) return;

  const KEY = "example-search";
  const SEEN_KEY = "example-search-seen";
  const KEEP = 4; // how many recent searches are worth keeping, and showing
  const SEEN = 4; // and how many opened products, which are kept apart from them
  const TERMS = 3; // word suggestions, above the products
  const HITS = 4; // products, which are the expensive rows to read

  // The four everyone looks for, in the markup rather than here: they are copy,
  // and the page they belong to is where copy is written.
  const popular = [...form.querySelectorAll("[data-shop-search-popular] li")].map((li) =>
    li.textContent.trim()
  );

  // Private browsing and blocked site data throw on every one of these, so each
  // is wrapped: losing the history means the panel opens on the popular four,
  // which is what a first visit sees anyway.
  const readRecent = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(raw) ? raw.filter((t) => typeof t === "string").slice(0, KEEP) : [];
    } catch {
      return [];
    }
  };

  const writeRecent = (terms) => {
    try {
      if (terms.length) localStorage.setItem(KEY, JSON.stringify(terms));
      else localStorage.removeItem(KEY);
    } catch {
      // Nothing to do: the panel falls back to the popular four.
    }
  };

  // Newest first, no duplicates, and the oldest falls off the end.
  const remember = (term) => {
    const q = term.trim();
    if (!q) return;
    const kept = readRecent().filter((t) => t.toLowerCase() !== q.toLowerCase());
    writeRecent([q, ...kept].slice(0, KEEP));
  };

  // A word and a product are different answers to "what were you doing here", so
  // they are kept apart rather than interleaved by time: four of each, and the
  // panel shows the products first because a shot is recognised before a word is
  // read. Stored whole, not as a link to look up later, since the pool is built
  // from whatever pages happen to be loaded and a product opened last week may
  // not be in it.
  const readSeen = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(SEEN_KEY));
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((p) => p && typeof p.href === "string" && typeof p.name === "string")
        .slice(0, SEEN);
    } catch {
      return [];
    }
  };

  const writeSeen = (items) => {
    try {
      if (items.length) localStorage.setItem(SEEN_KEY, JSON.stringify(items));
      else localStorage.removeItem(SEEN_KEY);
    } catch {
      // Same as the words: losing it leaves the panel on what it opens with.
    }
  };

  // By link, so the same product reached from two shelves is one entry.
  const rememberProduct = ({ href, brand, name, thumb }) => {
    if (!href) return;
    const kept = readSeen().filter((p) => p.href !== href);
    writeSeen([{ href, brand, name, thumb }, ...kept].slice(0, SEEN));
  };

  // ── The pool ──────────────────────────────────────────────────────────────
  // One entry per product, by link: the same product appears on more than one
  // shelf (a reduced chair is in Chairs and in Sale) and should be suggested
  // once.
  //
  // Built from whatever cards are on the page when the reader first opens the
  // panel, and rebuilt if that number has changed since. The results page fills
  // its grid from a fetch, so at load there is nothing to index there and by the
  // time anyone types there is.
  let products = [];
  let terms = [];
  let indexed = -1;

  // The catalogue and the colour families come from catalogue.js, which fetches
  // the listings once per visit however many things ask: the cards on any one
  // page are a sample of the shop, and the families ("Red" covers the token falu)
  // are declared in the Colour facet's own markup. Without them the panel offered
  // less than the page it leads to, which is the one thing a set of suggestions
  // must never do.
  const { load, match, tokens } = window.exampleCatalogue;
  let fetched = null;
  let families = new Map();

  const index = () =>
    load().then((shop) => {
      if (fetched) return;
      fetched = shop.cards;
      families = shop.families;
      indexed = -1; // the pool has grown, so it is built again
      if (!panel.hidden) render();
    });

  const build = () => {
    const onPage = [...document.querySelectorAll(".shop-card")];
    const cards = fetched ? [...onPage, ...fetched] : onPage;
    if (cards.length === indexed) return;
    indexed = cards.length;
    products = [];
    terms = [];
    const seen = new Set();
    const known = new Set();
    cards.forEach((card) => {
      const href = card.getAttribute("href");
      const brand = card.querySelector(".shop-card__brand")?.textContent.trim() || "";
      const name = card.querySelector(".shop-card__variant")?.textContent.trim() || "";
      const key = `${href} ${brand} ${name}`;
      if (!href || seen.has(key)) return;
      seen.add(key);
      const colour = card.dataset.color || "";
      products.push({
        href,
        brand,
        name,
        colour,
        thumb: card.querySelector(".shop-card__img")?.getAttribute("src") || "",
        // Colour, the families that colour belongs to, and the category, as well
        // as the words on the card: the same text the results page matches ?q=
        // against, so the panel and the page it leads to agree about what "red"
        // finds.
        text: [
          brand,
          name,
          colour,
          tokens(colour)
            .flatMap((c) => families.get(c) || [])
            .join(" "),
          card.dataset.category || ""
        ]
          .join(" ")
          .toLowerCase()
          .replace(/\s+/g, " ")
      });

      // A brand, a product's family, and every colour it comes in: "bro" should
      // offer Brown the way it offers a brand, because colour is how half of
      // these are asked for. Single words off the card's own data, capitalised
      // for the row the way the brand and the family already are.
      const title = (word) => word.charAt(0).toUpperCase() + word.slice(1);
      const colours = tokens(colour);
      [
        brand,
        name.split(",")[0].trim(),
        ...colours.map(title),
        ...colours.flatMap((c) => families.get(c) || [])
      ].forEach((term) => {
        const k = term.toLowerCase();
        if (!term || known.has(k)) return;
        known.add(k);
        terms.push(term);
      });
    });
    // Longest first, so the fuller phrase is offered before the brand it starts
    // with.
    terms.sort((a, b) => b.length - a.length);
  };

  // ── Rendering ─────────────────────────────────────────────────────────────
  const SEARCH_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>';

  let rows = []; // what is on screen, in order, each with what taking it does
  let active = -1;

  // The matched run in the reader's own words, the rest in bold: what is left to
  // type is the part worth seeing, which is the opposite of highlighting the
  // part they already know.
  // The typed run stays as it is and everything around it goes bold, whichever
  // side of it falls: what the reader has already written is the part they know,
  // and the word is being offered for the rest of it. A match at the start of a
  // later word leaves the words before it bold too, which is the same statement.
  const withMatch = (term, q) => {
    const span = document.createElement("span");
    span.className = "shop-search__text";
    const word = q.toLowerCase().trim().split(/\s+/).filter(Boolean)[0] || "";
    const from = term.toLowerCase().indexOf(word);
    if (from < 0) {
      span.textContent = term;
      return span;
    }
    const end = from + word.length;
    const bold = (text) => {
      if (!text) return null;
      const strong = document.createElement("strong");
      strong.textContent = text;
      return strong;
    };
    span.append(
      ...[bold(term.slice(0, from)), term.slice(from, end), bold(term.slice(end))].filter(Boolean)
    );
    return span;
  };

  const row = (kind, take) => {
    const li = document.createElement("li");
    li.className = `shop-search__row shop-search__row--${kind}`;
    li.id = `shop-search-row-${rows.length}`;
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", "false");
    list.append(li);
    rows.push({ el: li, take });
    return li;
  };

  const termRow = (term, q, resting) => {
    const li = row("term", () => submit(term));
    if (resting) li.classList.add("shop-search__row--resting");
    const icon = document.createElement("span");
    icon.className = "shop-search__icon";
    icon.innerHTML = SEARCH_ICON;
    li.append(
      icon,
      q
        ? withMatch(term, q)
        : Object.assign(document.createElement("span"), {
            className: "shop-search__text",
            textContent: term
          })
    );
  };

  const productRow = (product) => {
    const li = row("product", () => {
      rememberProduct(product);
      location.href = product.href;
    });
    const img = document.createElement("img");
    img.className = "shop-search__thumb";
    img.src = product.thumb;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    const text = document.createElement("span");
    text.className = "shop-search__text";
    const brand = document.createElement("span");
    brand.className = "shop-search__brand";
    brand.textContent = product.brand;
    const name = document.createElement("span");
    name.className = "shop-search__name";
    name.textContent = product.name;
    text.append(brand, name);
    li.append(img, text);
  };

  const render = () => {
    index();
    build();
    const q = input.value.trim();
    list.textContent = "";
    rows = [];
    active = -1;

    // No headings over either set. The rows say what they are: a word with a
    // magnifier beside it is something to search for, whether the reader typed it
    // last week or everyone types it, and a product is a product.
    const recent = readRecent();
    const seen = readSeen();

    // What the panel offers when it has nothing better: the products the reader
    // opened, then their own searches, then the popular ones they have not
    // already made, since the same word twice in one list is the list repeating
    // itself.
    // `resting` is the panel opened on nothing, which is the only state these
    // rows are the whole offer in: there they carry weight, and where they are a
    // fallback under a search that found nothing they read as the quieter thing
    // they are.
    const suggest = (resting) => {
      const add = (term) => termRow(term, "", resting);
      // Only on the resting panel. Under a search that found nothing these would
      // be four shots of things the reader did not ask for, which reads as an
      // answer rather than as the way out the fallback is meant to be.
      if (resting) seen.forEach(productRow);
      recent.forEach(add);
      // The popular four stay four whatever the reader has looked for: they are
      // what the shop is asked for, not a list of things they have not tried, so
      // searching Oak puts it in the history and leaves it popular.
      popular.slice(0, KEEP).forEach(add);
    };

    if (q) {
      terms
        .filter((t) => match(t.toLowerCase(), q))
        .slice(0, TERMS)
        .forEach((t) => termRow(t, q));
      products
        .filter((p) => match(p.text, q))
        .slice(0, HITS)
        .forEach(productRow);
    }

    // Nothing typed, or nothing found: either way the panel falls back to the
    // same thing, and there is no line telling the reader what they can already
    // see. A dead end is where the way out matters most, so what the panel shows
    // is somewhere to go rather than a sentence about not finding anything.
    const suggesting = !rows.length;
    if (suggesting) suggest(!q);

    // The label and its Clear belong to the history, so they are there only when
    // there is one, and only over the rows they name.
    if (bar) bar.hidden = !suggesting || !(recent.length + seen.length);

    mark();
    open(Boolean(list.children.length));
  };

  const mark = () => {
    rows.forEach(({ el }, i) => {
      el.classList.toggle("is-active", i === active);
      el.setAttribute("aria-selected", String(i === active));
    });
    const on = rows[active];
    if (on) {
      input.setAttribute("aria-activedescendant", on.el.id);
      on.el.scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  };

  // The panel, the card's own surface and the scrim over the page are one state,
  // so they are switched together rather than each watching for its own moment.
  const open = (on) => {
    panel.hidden = !on;
    // The class carries the card's surface and the scrim, which fades in off it
    // (see shop.css); the panel is the one thing that still needs telling.
    form.classList.toggle("is-open", on);

    // The same lock the dialogs use, so a panel covering the screen does not
    // leave the page scrolling underneath it. Only where it covers the screen.
    document.documentElement.classList.toggle("is-scroll-locked", on && phone.matches);
    input.setAttribute("aria-expanded", String(on));
    if (!on) {
      active = -1;
      input.removeAttribute("aria-activedescendant");
    }
  };

  // Taking a word is the same as typing it and pressing the button, so it goes
  // through the form: one path to the results, and the term is remembered once.
  const submit = (term) => {
    input.value = term;
    form.requestSubmit();
  };

  // ── Wiring ────────────────────────────────────────────────────────────────
  // Emptying the field is the field's own business, not the panel's: it goes back
  // to what it shows with nothing typed, and focus stays where the reader put it.
  wipe?.addEventListener("click", () => {
    input.value = "";
    input.focus();
    render();
  });

  closer?.addEventListener("click", () => {
    open(false);
    input.blur();
  });

  clear?.addEventListener("click", () => {
    writeRecent([]);
    writeSeen([]);
    input.focus();
    render();
  });

  input.addEventListener("input", render);
  input.addEventListener("focus", render);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!panel.hidden) e.stopPropagation();
      open(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (panel.hidden) {
        render();
        if (!rows.length) return;
      }
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      active = (active + step + rows.length + 1) % (rows.length + 1);
      // The last stop is the field itself, so arrowing past the end gives the
      // typed words back rather than wrapping straight onto the first row.
      if (active === rows.length) active = -1;
      mark();
      return;
    }
    if (e.key === "Enter" && rows[active]) {
      e.preventDefault();
      rows[active].take();
    }
  });

  list.addEventListener("mousedown", (e) => {
    // Before the blur: a press on a row would otherwise close the panel out from
    // under the click that was meant to take it.
    const li = e.target.closest(".shop-search__row");
    if (!li) return;
    e.preventDefault();
    rows.find((r) => r.el === li)?.take();
  });

  form.addEventListener("submit", () => {
    remember(input.value);
    open(false);
  });

  // Coming back to a page is arriving at it, not returning to the search that led
  // away from it: a browser restores a form's values on Back, and out of the
  // back/forward cache it hands the page over exactly as it was left, panel and
  // all.
  //
  // What the field should hold on arrival is whatever the URL asks for, which is
  // the query on the results page and nothing on the landing. Emptying it flatly
  // was wrong on the results page: it wiped the query it had just been given, and
  // took the Search button beside it out on the way past.
  addEventListener("pageshow", () => {
    input.value = new URLSearchParams(location.search).get("q") || "";
    // And the field gives focus up with it: restored focus would leave the page
    // arriving with a ring on a field nobody has touched yet, and the first
    // keystroke reopening a panel the reader never asked for.
    input.blur();
    open(false);
  });

  document.addEventListener("focusin", (e) => {
    if (!form.contains(e.target)) open(false);
  });

  document.addEventListener("pointerdown", (e) => {
    if (!form.contains(e.target)) open(false);
  });

  // The scrim is inside the form, so the handler above never sees a press on it:
  // covering the page is exactly an invitation to press somewhere else.
  scrim?.addEventListener("pointerdown", () => open(false));
})();
