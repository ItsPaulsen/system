// Product page: the colour swatches own the variant, so everything that differs
// between colourways (name, price, stock, and every image in the gallery) is
// read off the checked radio rather than kept in a table here. The
// radios do the selection themselves; this only renders what follows from it.
(function () {
  const inputs = Array.from(document.querySelectorAll(".pdp-swatch__input"));
  if (!inputs.length) return;

  const out = {
    color: document.querySelector("[data-pdp-color]"),
    variant: document.querySelector("[data-pdp-variant]"),
    price: document.querySelector("[data-pdp-price]"),
    stockRow: document.querySelector("[data-pdp-stock-row]"),
    stock: document.querySelector("[data-pdp-stock-label]"),
    status: document.querySelector("[data-pdp-status]"),
    care: document.querySelector("[data-pdp-care]"),

    terms: document.querySelector("[data-pdp-terms]"),
    regularLabel: document.querySelector("[data-pdp-regular-label]"),
    regular: document.querySelector("[data-pdp-regular]"),
    regularOff: document.querySelector("[data-pdp-regular-off]"),
    lowestLine: document.querySelector("[data-pdp-lowest-line]"),
    lowest: document.querySelector("[data-pdp-lowest]"),
    lowestOff: document.querySelector("[data-pdp-lowest-off]"),
    lead: document.querySelector("[data-pdp-lead]")
  };
  const sources = Array.from(document.querySelectorAll("[data-pdp-source]"));
  const images = Array.from(document.querySelectorAll("[data-pdp-img]"));
  const thumbs = Array.from(document.querySelectorAll("[data-pdp-thumb]"));
  // Beyond its pack shot a colourway can have shots of its own: oak has a back
  // view and a detail, black has a lifestyle one. data-extra on the radio lists
  // their stems, and the two slots below take them in order, so the number of
  // views follows the list rather than being declared beside it.
  const gallery = document.querySelector(".pdp-gallery");
  const extras = Array.from(document.querySelectorAll("[data-pdp-extra]"));
  const TIERS = [400, 640, 720, 1440];
  const srcsetFor = (stem) => TIERS.map((w) => `${stem}-${w}.webp ${w}w`).join(", ");

  // Two stock states, each a label plus the lead time it implies. The glyph that
  // goes with them is in the markup; the row's data-state picks which one shows.
  const STOCK = {
    in: { label: "In stock online", lead: "Ships in 2-4 days" },
    order: { label: "Made to order online", lead: "Ships in 6-8 weeks" }
  };

  const set = (el, text) => {
    if (el) el.textContent = text;
  };

  // Flipped once the opening colourway is on the page, so the status region only
  // speaks for changes the user made.
  let started = false;

  const render = (input) => {
    const d = input.dataset;
    set(out.color, d.color);
    // The colour is part of the product's name as well as the picker's value, so
    // the title carries it. Lowercased in CSS, not here, since the picker shows
    // the same string capitalised.
    set(out.variant, `, ${d.color}`);
    set(out.price, d.price);
    // What it was, struck through, for the colourways on offer. Hidden rather
    // than emptied, or the price row would keep its gap for a word that isn't
    // there.
    // Labelled, not just struck: the rule wants the prior price identifiable as
    // one, and a bare crossed-out number leaves the reader to guess what it is.
    if (d.regular) {
      // Normal price alone, Original beside a lower one: on its own it is what
      // the thing usually costs, and above a lowest recent price it is where the
      // run of offers started rather than what anyone was charged last.
      set(out.regularLabel, d.lowest ? "Original" : "Normal price");
      set(out.regular, d.regular);
      set(out.regularOff, d.regularOff);
    }
    // A regular price is what marks a colourway as reduced: it is the figure the
    // current price is being compared with, so there is no offer without one.
    const reduced = d.regular !== undefined;
    if (out.terms) out.terms.hidden = !reduced;
    // The price itself carries the offer, not just the small print under it.
    if (out.price) out.price.classList.toggle("is-reduced", reduced);
    // And the second line only where the colourway has been on offer inside the
    // window, which is what makes its prior price lower than its regular one.
    if (out.lowestLine) out.lowestLine.hidden = d.lowest === undefined;
    if (d.lowest) {
      set(out.lowest, d.lowest);
      set(out.lowestOff, d.lowestOff);
    }

    const stock = STOCK[d.stock] || STOCK.in;
    set(out.stock, stock.label);
    set(out.lead, stock.lead);
    if (out.stockRow) out.stockRow.dataset.state = STOCK[d.stock] ? d.stock : "in";
    // Three things moved at once and the radio only announces itself, so say the
    // rest. Not on the first render: the page hasn't changed yet, it has arrived,
    // and a region populated at load can read itself out over the page.
    if (out.status && started)
      set(
        out.status,
        `${d.color}, ${d.price}${d.regular ? `, reduced from ${d.lowest || d.regular}` : ""}, ${stock.label}`
      );
    // The oil is for a bare oak base, so it only belongs to the colourways that
    // have one; the lacquered and stained shells are not oiled and the leather
    // ones are only oak underneath when the swatch says so (data-care).
    if (out.care) out.care.hidden = d.care === undefined;
    // And the sections close with it. A colour change rewrites the page under
    // whatever is open, and the care row is in one of them: it appears or leaves
    // mid-read depending on the base. The gallery already goes back to the first
    // shot, so this is the same reset. Not on the first render, which is the page
    // arriving rather than changing.
    if (started) {
      document.querySelectorAll(".pdp-detail[open]").forEach((el) => {
        el.open = false;
      });
    }

    // One stem per colourway, the widths appended here: the same files the shop
    // card serves, so a colour change costs no new download on a page the listing
    // was reached from. Only the pack shot carries these hooks; the back view and
    // the detail shot belong to the model, not the colour.
    // 400/640/720 exist for every colourway; data-big names a larger tier where a
    // colour has a high-resolution source behind it (oak and black, so far).
    sources.forEach((el) => {
      const tiers = [400, 640, 720].concat(d.big ? [Number(d.big)] : []);
      el.srcset = tiers.map((w) => `${d.img}-${w}.webp ${w}w`).join(", ");
    });
    images.forEach((el, n) => {
      el.src = `${d.img}-640.jpg`;
      el.alt = n === 0 ? d.alt : "";
    });
    thumbs.forEach((el) => {
      el.src = `${d.img}-400.webp`;
    });

    // Each slot takes the stem at its own index, or leaves if the colour has none.
    // The extras are shown alt="", since slide one carries the product's own
    // description and these are further views of the same thing.
    const stems = (d.extra || "").split(" ").filter(Boolean);
    extras.forEach((el) => {
      const stem = stems[Number(el.dataset.pdpExtra) - 1];
      el.hidden = !stem;
      if (!stem) return;
      const source = el.querySelector("[data-pdp-extra-source]");
      const img = el.querySelector("[data-pdp-extra-img]");
      const thumb = el.querySelector("[data-pdp-extra-thumb]");
      if (source) source.srcset = srcsetFor(stem);
      if (img) img.src = `${stem}-640.jpg`;
      if (thumb) thumb.src = `${stem}-400.webp`;
    });
    const views = 1 + stems.length;
    if (gallery) {
      gallery.dataset.pdpViews = String(views);
      // Told after the slides, so it re-measures a set that is a different size.
      gallery.dispatchEvent(new CustomEvent("carousel:refresh"));

      // Back to the pack shot: the colour that was picked is the one to show, and
      // a track left translated onto a slide that has just been hidden would park
      // the gallery on nothing. Placed, not slid: animating it reads as the new
      // colour arriving from the side rather than as the gallery resetting.
      gallery.dispatchEvent(
        new CustomEvent("carousel:goto", { detail: { index: 0, animate: false } })
      );
    }
  };

  inputs.forEach((input) =>
    input.addEventListener("change", () => {
      if (input.checked) render(input);
    })
  );

  // Hovering a swatch names it in the legend, so the row can be read without
  // clicking through it. Only the legend previews: the title and the price belong
  // to the colour that is actually selected. The checked name comes back on the
  // way out, and a hover that turns into a click needs nothing here, since the
  // change above re-renders everything.
  const list = document.querySelector(".pdp-color__list");
  list?.addEventListener("mouseover", (e) => {
    const swatch = e.target.closest(".pdp-swatch")?.querySelector(".pdp-swatch__input");
    if (swatch) set(out.color, swatch.dataset.color);
  });
  list?.addEventListener("mouseleave", () => {
    const checked = inputs.find((i) => i.checked);
    if (checked) set(out.color, checked.dataset.color);
  });

  // A press that takes a moment and then says so: loading, then a check and a
  // word, then back to what it was. There is no request behind either of them
  // here, but the shape is the real one, and a button that answers instantly
  // teaches people it did nothing.
  //
  // aria-disabled and pointer-events rather than `disabled`, so the skin and the
  // spinner's currentcolor survive; the guard at each call site is what stops a
  // second press counting the same add twice.
  const SENDING = 700;
  const CONFIRMING = 1400;
  const confirmPress = (btn, label, { announce, restore }) => {
    btn.classList.add("button--loading");
    btn.setAttribute("aria-busy", "true");
    btn.setAttribute("aria-disabled", "true");

    setTimeout(() => {
      btn.classList.remove("button--loading");
      btn.removeAttribute("aria-busy");
      // The check is a start icon while it's there, so the pair sits on the same
      // inset as any other icon-and-label button.
      btn.classList.add("is-added", "button--with-start-icon");
      label.textContent = "Added";
      set(out.status, announce);

      setTimeout(() => {
        btn.classList.remove("is-added", "button--with-start-icon");
        btn.removeAttribute("aria-disabled");
        // Only the way back differs: one button says what pressing it will do
        // next, the other just says Add again.
        restore();
      }, CONFIRMING);
    }, SENDING);
  };

  // The button says what pressing it will do, so the quantity beside it reads as
  // part of the sentence rather than a widget parked next to a button. One is the
  // resting case and gets the plain label: "Add 1 item to cart" is a number nobody
  // chose. The count is also the button's accessible name, so it's announced on
  // focus without anything live.
  //
  // Pressing it spends a moment loading and a moment confirming before it offers
  // itself again. There's no request behind it here, but the shape is the real
  // one: a cart add is a round trip, and a button that answers instantly teaches
  // people it didn't do anything.
  const add = document.querySelector("[data-pdp-add]");
  const qty = document.querySelector("[data-pdp-qty]");
  const qtyInput = qty && qty.querySelector(".number-field__input");
  const addLabel = add && add.querySelector("[data-pdp-add-label]");

  if (add && qtyInput && addLabel) {
    const idle = () =>
      !add.classList.contains("button--loading") && !add.classList.contains("is-added");
    // initNumberFields fires `change` on every step; `input` covers typing, and
    // the field clamps a nonsense value on blur, which is a change of its own.
    // Only while the button is offering: mid-press the label is the state, and
    // stepping the quantity then shouldn't write over it.
    const label = () => {
      if (!idle()) return;
      const n = Number(qtyInput.value);
      addLabel.textContent = n > 1 ? `Add ${n} items to cart` : "Add to cart";
    };
    qtyInput.addEventListener("change", label);
    qtyInput.addEventListener("input", label);
    label();

    // No cancelling: the guard means a press can only start from rest, so there is
    // never a run in flight to interrupt.
    add.addEventListener("click", () => {
      if (!idle()) return;
      const n = Number(qtyInput.value);
      confirmPress(add, addLabel, {
        // The button says it, but a press with a mouse may not have put focus
        // there, and a button's name changing under nobody is a change nobody
        // hears. Same region the colour change uses.
        announce: n > 1 ? `${n} items added to cart` : "Added to cart",
        restore: label
      });
    });
  }

  // The care suggestion under Materials and care. The same press, so the two
  // buttons on this page answer the same way: a small secondary one in a section
  // that has to be opened, and the column's primary one, both saying what they
  // did where the eye already is rather than sending a toast after the fact.
  const careAdd = document.querySelector("[data-pdp-care-add]");
  const careLabel = careAdd && careAdd.querySelector("[data-pdp-care-label]");
  if (careAdd && careLabel) {
    careAdd.addEventListener("click", () => {
      if (careAdd.classList.contains("button--loading") || careAdd.classList.contains("is-added"))
        return;
      confirmPress(careAdd, careLabel, {
        announce: "Wood oil added to cart",
        restore: () => {
          careLabel.textContent = "Add";
        }
      });
    });
  }

  // Favorite is a toggle, so the toast has to be able to say both things. The
  // shell reads the line and its type off the button when the click reaches
  // document (assets/app.js), and a listener on the button itself runs first, so
  // this sets them for the press already in flight rather than the next one.
  //
  // Success on the way in and the shell's `removed` on the way out: a green check
  // for undoing something would congratulate the user for the thing they just
  // took back, and red would report a deliberate removal as a failure.
  const save = document.querySelector("[data-pdp-save]");
  save?.addEventListener("click", () => {
    const on = save.getAttribute("aria-pressed") !== "true";
    save.setAttribute("aria-pressed", String(on));
    save.dataset.toast = on ? "Added to favorites" : "Removed from favorites";
    save.dataset.toastType = on ? "success" : "removed";
  });

  // The rail's chevrons page it by three tiles. The Scroll Area keeps the wheel,
  // touch and keyboard scrolling; these are the coarse affordance over the tiles,
  // and each hides itself once the rail is against that end, so a chevron never
  // sits there doing nothing.
  const rail = document.querySelector("[data-pdp-rail]");
  const railView = rail && rail.querySelector(".scroll-area__viewport");
  if (rail && railView) {
    const steps = Array.from(rail.querySelectorAll("[data-pdp-rail-step]"));
    const tile = () => {
      const first = railView.querySelector(".pdp-thumb");
      return first ? first.getBoundingClientRect().height + 8 : 104;
    };
    const sync = () => {
      const room = railView.scrollHeight - railView.clientHeight;
      steps.forEach((b) => {
        const back = Number(b.dataset.pdpRailStep) < 0;
        // 1px of slack: a fractional scrollTop at an end still counts as the end.
        b.hidden = room <= 8 || (back ? railView.scrollTop <= 1 : railView.scrollTop >= room - 1);
      });
    };
    steps.forEach((b) =>
      b.addEventListener("click", () => {
        // The CSS reduced-motion guard sets scroll-behavior, but an explicit
        // JS "smooth" overrides it, so the paging step has to ask as well.
        const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
        railView.scrollBy({ top: Number(b.dataset.pdpRailStep) * tile() * 3, behavior });
      })
    );
    // Arrowing inside the rail steps it and takes focus along, the way it does in
    // any list you arrow through: both axes, because the rail is a vertical column
    // from lg and a row of dots below it. The carousel root handles left and right
    // too, so the event is stopped here or the slide would move twice — and that
    // handler doesn't move focus, which is what left the ring behind on the first
    // thumb while the current one moved on.
    const STEPS = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    rail.addEventListener("keydown", (e) => {
      const step = STEPS[e.key] || 0;
      if (!step) return;
      e.stopPropagation();
      const shown = Array.from(rail.querySelectorAll(".pdp-thumb")).filter(
        (t) => !t.closest("li").hidden
      );
      const from = shown.findIndex((t) => t.getAttribute("aria-current") === "true");
      const next = shown[Math.max(0, Math.min(shown.length - 1, Math.max(from, 0) + step))];
      if (!next || next === shown[from]) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      next.click();
      next.focus();
    });

    railView.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    sync();
  }

  // Larger view: the gallery node moves into the dialog and back out again, the
  // way the listing's filter rail moves between its rail and its sheet. One
  // carousel, so which slide is showing, which colour it belongs to and the
  // track's own transform all come along, and there is no second set of slides to
  // keep in step. The dialog's own opening is the generic [data-dialog-open]
  // wiring in app.js; this only owns the move.
  const zoom = document.getElementById("pdp-zoom");
  const slot = zoom && zoom.querySelector("[data-pdp-zoom-slot]");
  if (gallery && zoom && slot) {
    const home = gallery.parentNode;
    const next = gallery.nextElementSibling;
    // A resize is what makes the carousel re-measure a track whose viewport just
    // changed width; without it the slide would sit at the old offset.
    const remeasure = () => window.dispatchEvent(new Event("resize"));

    // The photograph carries data-dialog-open itself, so app.js opens it the same
    // way the button does: that's what locks the body scroll and parks focus, so
    // nothing opens with a stray ring on the close button. All this has to do is
    // stop the click that ends a drag from getting there, and that means
    // propagation rather than preventDefault, since the handler that opens is
    // delegated on the document. The carousel swallows that click too; measuring
    // the pointer here as well means it doesn't matter which listener runs first.
    const viewport = gallery.querySelector(".carousel__viewport");
    if (viewport) {
      let downAt = null;
      viewport.addEventListener("pointerdown", (e) => {
        downAt = { x: e.clientX, y: e.clientY };
      });
      viewport.addEventListener("click", (e) => {
        const dragged = downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 4;
        downAt = null;
        if (dragged) e.stopPropagation();
      });
    }

    // The button opens through app.js's delegated handler. This listener is
    // registered while the document is still parsing, so it runs first and the
    // gallery is already in the slot by the time the dialog opens. `close` covers
    // every way out (button, backdrop, Escape).
    // Looping isn't set here any more: it belongs to the colour's shot count (see
    // render), so it holds on the page as well as in the panel.
    // A still copy holds the gallery's place on the page while the real one is
    // away. Without it the photograph leaves the page in the same frame the panel
    // starts fading in, so the fade plays over a hole where the image was, which
    // is what read as a flicker. The clone needs no wiring: it carries the track's
    // inline transform, so it draws the slide the gallery was showing, and app.js
    // has long since run, so its data-carousel is never initialised. inert and
    // aria-hidden keep it out of the tab order, the accessibility tree, and the
    // delegated open handler its viewport would otherwise still match.
    // Where the page was when the panel opened. The panel is one carousel with the
    // page, so without this the slide you left it on came back with it: open on
    // the pack shot, look through to the third, and the page had moved to the
    // third too. The larger view is a look at the set, not a change to the page.
    let from = 0;
    let left = 0;
    let stand = null;

    // Which slide the gallery is on, and putting it back on one. A transform track
    // carries its position in an inline style and a scrolling one carries it in
    // scrollLeft, which a move through the DOM resets and a clone doesn't copy at
    // all, so neither survives being carried about. The index does, and the
    // carousel knows how to land on it either way.
    const viewportOf = (el) => el.querySelector(".carousel__viewport");
    // Before the remeasure, never after it. A move resets a scrolling track to
    // nought, and the carousel's own idea of which slide it is on comes from where
    // it has just been, so the resize the move fires re-snapped to that and this
    // put it back a frame later. Two frames, crossing and returning: too quick to
    // read as the photograph moving, and just slow enough to read as the dot under
    // it blinking. Said first, the re-snap agrees and there is nothing to undo.
    const place = (i) => {
      // Silence the rail across the move. Placing a slide makes one dot current
      // and the last one stop being current, and the one stopping animates its
      // background out over --motion-default. That animation is still running when
      // the gallery lands on the page, whichever direction the panel went in, and
      // it is the whole of what reads as a blink. Two frames is the same guard
      // setTheme uses for the same reason.
      gallery.classList.add("pdp-gallery--placing");
      gallery.dispatchEvent(
        new CustomEvent("carousel:goto", { detail: { index: i, animate: false } })
      );
      requestAnimationFrame(() =>
        requestAnimationFrame(() => gallery.classList.remove("pdp-gallery--placing"))
      );
    };

    const enter = () => {
      // Already in the panel: the photograph carries the open hook with it, so a
      // click on it in there matches too. Without this that click stood a second
      // copy up on the page, and only the newest one was ever taken down again.
      if (gallery.parentNode === slot) return;
      const current = gallery.querySelector('[data-carousel-goto][aria-current="true"]');
      from = current ? Number(current.dataset.carouselGoto) : 0;
      left = viewportOf(gallery)?.scrollLeft || 0;
      stand = gallery.cloneNode(true);
      stand.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
      stand.inert = true;
      stand.setAttribute("aria-hidden", "true");
      home.insertBefore(stand, next);
      // The stand-in has to look like what it replaces, and a clone of a scrolling
      // track comes back at nought: it stood the first shot in for the third, so
      // the page flashed a different photograph as the panel came up.
      const standing = viewportOf(stand);
      if (standing) standing.scrollLeft = left;
      slot.append(gallery);
      place(from);
      remeasure();
    };
    const leave = () => {
      // Put it back on its slide while it is still in the panel, so it arrives on
      // the page already correct. Coming back on the panel's slide and being
      // corrected in the same frame sounds free, and is for the photograph, but a
      // dot carries a background transition: the one the panel left current
      // arrived painted dark and then spent 150ms fading out. Nothing paints
      // between the two, so the only thing anyone saw was that fade, and only
      // where the rail is dots (a thumbnail's current state is a ring, which
      // isn't transitioned).
      place(from);
      home.insertBefore(gallery, next);
      // Straight back to where the page was, in the same breath as the move. The
      // index would get there too, but a frame later, and in that frame the row
      // has scrolled to nought and told the dots so: the picture held still and
      // the dot under it went to the first and back. The page's own width hasn't
      // changed since it left, so the pixels it left on are still the right ones.
      const back = viewportOf(gallery);
      if (back) back.scrollLeft = left;
      stand?.remove();
      stand = null;
      // The page's own width is what the set has to be measured against, and then
      // the slide is named again in that layout. The call above is what stops a
      // dot arriving stale, but it is measured against the panel, which is a
      // different width; this is the one that is right about pixels. Saying it
      // rather than leaving it to the re-snap the resize happens to fire: nothing
      // paints between the two, so it costs a frame of nothing and owes no debt to
      // another handler's timing.
      remeasure();
      place(from);
    };

    // The panel fades out as well as in, so the gallery leaves on the fade's tail
    // rather than on the close event: pull it out while the panel is still on
    // screen and the panel empties as it goes. Until then the page shows the
    // stand-in, which looks the same. The duration is read off the panel, so the
    // stylesheet stays the one place it's set (computed durations are in seconds).
    let back;
    document.addEventListener("click", (e) => {
      if (!e.target.closest('[data-dialog-open="pdp-zoom"]')) return;
      // Reopened inside the fade: the pending move back would empty the panel.
      clearTimeout(back);
      enter();
    });

    zoom.addEventListener("close", () => {
      const secs = parseFloat(getComputedStyle(zoom).transitionDuration) || 0;
      clearTimeout(back);
      back = setTimeout(leave, secs * 1000);
    });
  }

  // Deep link from a Shop card: ?color=<slug> opens on that colourway. Rendering
  // the checked one either way is what sets data-pdp-views for the colour the
  // page opens on, so the markup only has to carry oak's own state.
  const asked = new URLSearchParams(location.search).get("color");
  const wanted = asked && inputs.find((i) => i.value === asked);
  if (wanted) wanted.checked = true;
  const current = inputs.find((i) => i.checked);
  if (current) render(current);
  started = true;

  // And the shots the head script covered for that link come back, once the first
  // of them has decoded: what appears is then the photograph rather than the
  // empty frame it would uncover a moment early.
  const root = document.documentElement;
  if (root.dataset.pdpDeepLink !== undefined) {
    const show = () => delete root.dataset.pdpDeepLink;
    if (images[0]?.decode) images[0].decode().then(show, show);
    else show();
  }
})();

// The related row is a scroll container rather than a carousel: its cards are the
// listing's own, and a grid is what they are built for. Touch already scrolls it,
// so this is the pointer drag and the hover arrows, so it answers a mouse the way
// the gallery does. Neither one snaps mid-move: a
// fixed-width shelf is pushed along, not stepped between slides. Both only tidy
// up at the end, landing on the nearest card boundary.
(function () {
  const row = document.querySelector(".pdp-related__grid");
  if (!row) return;

  const shelf = row.closest(".pdp-related__shelf");
  const prev = shelf?.querySelector(".carousel__control--prev");
  const next = shelf?.querySelector(".carousel__control--next");

  const RESIST = 0.3; // the fraction of an overpull that shows, as in the carousel
  const DRAG = 5; // px of travel before a press counts as a drag rather than a click
  const COAST = 260; // ms of travel a release is worth, at the speed it was let go

  // A card's width is a sixth of the content cap, which doesn't divide evenly, so
  // a row of six that is meant to fit exactly can report a pixel or two of
  // overflow. That isn't somewhere to go, and treating it as somewhere to go put
  // a live Next arrow over the last product with nothing behind it to reach.
  const SLACK = 4;
  const scrollable = () => row.scrollWidth - row.clientWidth > SLACK;

  let down = false;
  let startX = 0;
  let startLeft = 0;
  let moved = false;
  let frame;
  let pull = 0;
  let pointer = null;
  let swallow = false; // the drag's own trailing click, still to be spent
  let vx = 0; // px/ms, smoothed over the move events
  let lastX = 0;
  let lastT = 0;

  // How far the cards sit past where the scroll can go. The scroller is clamped by
  // the browser, so this is drawn by shifting the children (see product.css).
  const setPull = (px) => {
    pull = px;
    row.style.setProperty("--pdp-related-pull", `${px}px`);
  };

  // An arrow is only there while it has somewhere to go: hidden at the end it
  // points to, and both hidden when the window is wide enough to show every card
  // (the six-column case, where the row has nothing to scroll). Hiding rather
  // than disabling, because the row is hover chrome: a dimmed arrow over the
  // first product would be something to read and dismiss, and there is nothing
  // to explain.
  const sync = () => {
    if (!prev || !next) return;
    const max = row.scrollWidth - row.clientWidth;
    const at = row.scrollLeft;
    const stuck = !scrollable();
    prev.hidden = stuck || at <= SLACK;
    next.hidden = stuck || at >= max - SLACK;
  };

  // Where each card sits in the scroll, measured from the first one so the row's
  // own start padding (it bleeds to the window edge below md) counts as zero.
  const stops = () => {
    const base = row.firstElementChild?.offsetLeft || 0;
    return [...row.children].map((c) => c.offsetLeft - base);
  };

  // Ease out, and short: this is a correction of at most a card's width, not a
  // slide crossing the window, so it lands rather than travels. Any overpull
  // unwinds on the same curve, so the row arrives and straightens as one move.
  const glide = (to) => {
    const fromScroll = row.scrollLeft;
    const fromPull = pull;
    const dist = to - fromScroll;
    if (Math.abs(dist) < 1 && Math.abs(fromPull) < 1) return;
    const ms = Math.min(700, 160 + Math.max(Math.abs(dist), Math.abs(fromPull)) * 0.5);
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - (1 - p) ** 3;
      row.scrollLeft = fromScroll + dist * eased;
      setPull(fromPull * (1 - eased));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(step);
  };

  // Let go and the row carries on, then lands with a card flush to the start, so
  // what you see is whole cards and one peeking. The throw is the point: a shelf
  // that only ever corrected itself by half a card felt like it was resisting the
  // hand, however hard you pushed. Where it would have coasted to is speed times a
  // fixed time, and the nearest card to that is where it lands.
  //
  // At either end it stays where it is: the row is already against something, and
  // pulling it off that edge to align a card would undo the drag. It still glides,
  // to let any overpull go.
  const settle = () => {
    const max = row.scrollWidth - row.clientWidth;
    const at = row.scrollLeft;
    if (at <= 1 || at >= max - 1) {
      glide(at);
      return;
    }
    const thrown = at - vx * COAST;
    const near = stops().reduce(
      (best, o) => (Math.abs(o - thrown) < Math.abs(best - thrown) ? o : best),
      0
    );
    glide(Math.max(0, Math.min(max, near)));
  };

  row.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.pointerType !== "mouse") return;
    // A row that fits has nothing to drag, and arming the gesture anyway is what
    // made a press on a card get thrown away as though it had been one.
    if (!scrollable()) return;
    cancelAnimationFrame(frame); // taking hold of a row still settling
    down = true;
    moved = false;
    // A fresh press is never the tail of the last one, whatever became of that
    // gesture's click.
    swallow = false;
    startX = e.clientX;
    startLeft = row.scrollLeft;
    vx = 0;
    lastX = e.clientX;
    lastT = e.timeStamp;
    pointer = e.pointerId;
    row.classList.add("is-dragging");
  });

  // What the pointerdown used to prevent. Cancelling that default is the blunt
  // way to stop a card being dragged off as a link, and it also suppresses the
  // mouse events the click is built from, which browsers resolve differently:
  // that was a press going nowhere for no visible reason. This cancels the one
  // thing it was ever for, and the pressed row stops selecting text through the
  // .is-dragging class instead.
  row.addEventListener("dragstart", (e) => e.preventDefault());

  row.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    const max = row.scrollWidth - row.clientWidth;
    const want = startLeft - dx;
    const to = Math.max(0, Math.min(max, want));
    row.scrollLeft = to;
    // Whatever the scroll couldn't take is the overpull, resisted.
    setPull((to - want) * RESIST);
    // Smoothed, because a single frame's reading is noise: the last events before
    // a release are what the hand was doing, not the whole drag.
    const dt = e.timeStamp - lastT;
    if (dt > 0) {
      vx = vx * 0.7 + ((e.clientX - lastX) / dt) * 0.3;
      lastX = e.clientX;
      lastT = e.timeStamp;
    }
    // A drag is a gesture that took the shelf somewhere, not a pointer that
    // wandered. Hand-holding a mouse through a click moves it a few pixels, and
    // counting that as a drag is what made the cards need several tries: the row
    // hadn't gone anywhere, but the click was swallowed as if it had.
    if (!moved && Math.abs(dx) > DRAG && (row.scrollLeft !== startLeft || pull)) {
      moved = true;
      // Captured only now that it is a drag, never on the press itself. While the
      // row holds the pointer, the mouse events the click is built from are
      // retargeted to the row, so the click lands on the container and a card's
      // link is never followed: taking it up front made every card on a
      // scrollable row unopenable. A drag has no link to follow, so from here it
      // is free, and it keeps the gesture once the pointer leaves the row.
      row.setPointerCapture(pointer);
    }
  });

  const endDrag = (e) => {
    if (!down) return;
    down = false;
    if (row.hasPointerCapture?.(e.pointerId)) row.releasePointerCapture(e.pointerId);
    row.classList.remove("is-dragging");
    if (!moved) {
      if (pull) glide(row.scrollLeft);
      return;
    }
    settle();
    // Let go over a card and the click would follow its link, so the drag's own
    // trailing click is spent here. A flag rather than a listener that takes
    // itself off a frame later: whether that frame beat the click was a race, and
    // losing it left a live swallow to eat the next honest press.
    swallow = true;
  };

  // Exactly one click, and only the one the drag itself produced. The cards are
  // anchors, but a page could bind a listener to them too, so the event is
  // stopped as well as defaulted (same as the carousel's own guard).
  row.addEventListener(
    "click",
    (e) => {
      if (!swallow) return;
      swallow = false;
      e.preventDefault();
      e.stopPropagation();
    },
    { capture: true }
  );

  row.addEventListener("pointerup", endDrag);
  row.addEventListener("pointercancel", endDrag);
  row.addEventListener("lostpointercapture", endDrag);

  // A press moves the row by what's on screen, then lands on a card boundary the
  // way a release does, so the arrows and the drag leave the shelf in the same
  // kind of position. The last step is short by whatever the row has left, which
  // is the end clamp doing its job rather than a case to special-case.
  const page = (dir) => {
    cancelAnimationFrame(frame);
    const max = row.scrollWidth - row.clientWidth;
    const want = row.scrollLeft + dir * row.clientWidth;
    const near = stops().reduce(
      (best, o) => (Math.abs(o - want) < Math.abs(best - want) ? o : best),
      0
    );
    glide(Math.max(0, Math.min(max, near)));
  };

  prev?.addEventListener("click", () => page(-1));
  next?.addEventListener("click", () => page(1));

  // Every move the row makes -- a drag, a glide, a trackpad, a tab into a card
  // off screen -- lands as a scroll event, including the ones set from here, so
  // this one listener is the whole story. Resize, because how much there is to
  // scroll changes with the window.
  row.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  sync();
})();

// Which store has this one, and which store the reader has chosen.
//
// The rows in the sheet are the data: each carries its coordinates and what the
// shelf holds, so the pins are built from the list the reader can already see
// and the buy column's line is read off the chosen row. The list is the control
// at every width; the map is a second view of it, built on first open and left
// out entirely if its scripts never arrive.
//
// The choice is the shop listing's choice too (store.js), so picking here lands
// the listing already filtered, and picking there answers this page back.
(function () {
  const block = document.querySelector("[data-pdp-store-row]");
  const sheet = document.getElementById("pdp-store-sheet");
  if (!block || !sheet) return;

  const text = block.querySelector("[data-pdp-store-text]");
  const action = block.querySelector("[data-pdp-store-action]");
  const title = sheet.querySelector("[data-pdp-store-title]");
  const status = document.querySelector("[data-pdp-status]");

  const picker = sheet.querySelector("[data-pdp-picker]");
  const toggle = sheet.querySelector("[data-pdp-picker-toggle]");
  const toggleLabel = sheet.querySelector("[data-pdp-picker-toggle-label]");
  const mapEl = sheet.querySelector("[data-pdp-store-map]");
  const canvas = sheet.querySelector(".pdp-store-map__canvas");
  const list = sheet.querySelector("[data-pdp-store-list]");
  const emptyEl = sheet.querySelector("[data-pdp-store-empty]");
  const filters = [...sheet.querySelectorAll("[data-pdp-store-filter]")];
  const search = sheet.querySelector("[data-pdp-store-search]");
  const cards = [...sheet.querySelectorAll(".pdp-store-row")];
  if (!cards.length) return;

  // Where each row started, so every pass rebuilds the list from the same set
  // rather than from whatever the last pass left behind.
  const items = new Map(cards.map((card) => [card, card.parentElement]));

  // Stock is what the warehouse holds and ships; available is what is on a shelf
  // you can walk to. The buy column's two lines use one word each, and the
  // store's line says the same number the sheet's rows do, so the page never
  // gives one shop two different answers.
  const available = (n) => (n ? `${n} available` : "None available");

  const colours = document.querySelector(".pdp-color__list");
  const colour = () => document.querySelector(".pdp-swatch__input:checked")?.value || "";

  // How many the shop is holding of this piece; data-stock-out names the
  // colourways it never carried, so a shelf can be full of the oak and have none
  // of the dark brown. Listed on the row rather than a count per colour, since
  // the exceptions are the short half of that table.
  const countOf = (card) => {
    const out = (card.dataset.stockOut || "").split(/\s+/).filter(Boolean);
    if (out.includes(colour())) return 0;
    return Number(card.dataset.count) || 0;
  };

  // The state is read off the number rather than stored beside it, so the mark
  // and the count can't disagree about what "few" is.
  const FEW = 3;
  const stockOf = (card) => {
    const n = countOf(card);
    if (!n) return "none";
    return n <= FEW ? "few" : "in";
  };

  const latLng = (card) => [Number(card.dataset.lat), Number(card.dataset.lng)];
  const nameOf = (card) => card.querySelector(".ex-store-row__name").textContent.trim();
  const distanceOf = (card) => Number(card.dataset.distance) || 0;

  // How many of the nearest get a group of their own before the regions start.
  const NEAR = 4;

  const PICKED_ZOOM = 13;
  const markers = new Map();
  let clusters = null;
  let map = null;
  let active = null;

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

  const fit = () => {
    if (!map) return;
    map.fitBounds(window.L.latLngBounds(cards.map(latLng)), { padding: [26, 26], animate: false });
  };

  // Every pin stays on the map here, unlike the listing's picker: this sheet is
  // where a store is compared against the others, so hiding the rest would take
  // away the comparison the reader opened it for.
  const render = () => {
    cards.forEach((card) => {
      card.setAttribute("aria-pressed", String(card === active));
      markers.get(card)?.setIcon(icon(card === active));

      // Written here rather than left in the markup: a row's state follows the
      // chosen colourway, so the badge is only true until the next swatch.
      const state = stockOf(card);
      card.dataset.state = state;
      // The number, not the state's word: the list is where shops are compared,
      // and "14 available" against "2 available" is the comparison. The buy
      // column keeps the words, where there is room for a sentence.
      const n = countOf(card);
      const line = card.querySelector("[data-pdp-card-stock]");
      if (line) line.textContent = available(n);
    });

    // Unchosen, the line answers the question a reader has before they have a
    // store in mind: how many shops have it at all. Counted off the rows rather
    // than written down, so it can't disagree with the list it came from.
    if (!active) {
      const stocked = cards.filter((c) => countOf(c) > 0).length;
      block.dataset.state = stocked ? "in" : "none";
      if (text) text.textContent = `Available in ${stocked} stores`;
      if (action) action.textContent = "Choose a store";
      // The sheet is named by the button that opens it, so the reader arrives at
      // the thing they pressed rather than at a different word for it.
      if (title) title.textContent = "Choose a store";
      return;
    }

    const state = stockOf(active);
    block.dataset.state = state;
    if (text) {
      // The shop's name is the part that changes and the part being looked for,
      // so it is a node of its own rather than the tail of a sentence.
      const store = document.createElement("span");
      store.className = "pdp-avail__store";
      store.textContent = nameOf(active);
      text.replaceChildren(`${available(countOf(active))} at `, store);
    }
    if (action) action.textContent = "Change store";
    if (title) title.textContent = "Change store";
  };

  // One entry point: the buy column's line and the list are two views of the
  // same choice, so nothing calls only half of it.
  const renderAll = () => {
    render();
    renderList();
  };

  // A colourway the chosen shop never carried changes this line without the
  // store changing, so the swatches redraw it.
  colours?.addEventListener("change", renderAll);

  // ── The list ──────────────────────────────────────────────────────────────
  // Rebuilt from the rows on every pass: the chosen store first under its own
  // heading, then the nearest few, then what is left by region. A row appears
  // once, in the first group that claims it, so "near me" and a region never
  // show the same shop twice.
  const on = (name) => filters.find((f) => f.dataset.pdpStoreFilter === name)?.checked;

  // Name, street and the region it is filed under, the same four fields the store
  // finder searches: typing a group name finds everything in it. Not the whole
  // row's text, which would drag the opening line in and let "open" match every
  // shop printing a closing time, and not the stock line either, which would make
  // "in stock" a search term.
  const matches = (card) => {
    const q = (search?.value || "").trim().toLowerCase();
    if (!q) return true;
    const name = card.querySelector(".ex-store-row__name")?.textContent || "";
    const address = card.querySelector(".ex-store-row__address")?.textContent || "";
    return `${name} ${address} ${card.dataset.region || ""}`.toLowerCase().includes(q);
  };

  const heading = (label, icon) => {
    const li = document.createElement("li");
    li.className = "pdp-store-group";
    li.innerHTML =
      `<span class="pdp-store-group__icon" aria-hidden="true">${icon}</span>` +
      `<span class="pdp-store-group__label"></span>`;
    li.querySelector(".pdp-store-group__label").textContent = label;
    return li;
  };

  // Filled, like the marks on the rows they head.
  const CHECK =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17 3.34a10 10 0 ' +
    "1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336zm-1.293 5.953a1 1 0 0 0 " +
    "-1.32 -.083l-.094 .083l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.403 1.403l.083 " +
    '.094l2 2l.094 .083a1 1 0 0 0 1.226 0l.094 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" /></svg>';

  const PIN =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.364 4.636a9 9 ' +
    "0 0 1 .203 12.519l-.203 .21l-4.243 4.242a3 3 0 0 1 -4.097 .135l-.144 -.135l-4.244 -4.243a9 " +
    '9 0 0 1 12.728 -12.728zm-6.364 3.364a3 3 0 1 0 0 6a3 3 0 0 0 0 -6" /></svg>';

  const renderList = () => {
    if (!list) return;

    // The chosen store is always on the list, whatever the filters say: it is
    // the answer the buy column is already showing, and hiding it would leave
    // no way back to it.
    const kept = cards.filter(
      (c) =>
        c === active ||
        (matches(c) &&
          (!on("stock") || stockOf(c) !== "none") &&
          (!on("open") || c.dataset.open === "true"))
    );

    // Emptying the list detaches whatever row has focus, which drops it to the
    // body and takes the ring with it: the rows survive the rebuild (they are
    // moved, not recreated), so the one that had focus gets it back after.
    // The row that had focus may be a copy this pass throws away, so what is
    // remembered is which store it was, not which element.
    const was = list.contains(document.activeElement)
      ? document.activeElement.closest(".pdp-store-row")?.dataset.store
      : null;

    list.textContent = "";

    // A group is a heading and then one surface holding its rows, so the label
    // sits over the box the way it does on the rest of the site rather than
    // inside it. The rows keep their hairlines; the box supplies the corners and
    // the inset.
    let set = null;
    const group = (label, icon) => {
      list.append(heading(label, icon));
      const li = document.createElement("li");
      li.className = "pdp-store-set";
      const ul = document.createElement("ul");
      ul.className = "ex-store-list pdp-store-set__list";
      li.append(ul);
      list.append(li);
      set = ul;
    };

    const place = (card) => set?.append(items.get(card));

    // The shortcut groups show a copy, so the row keeps its place under its own
    // region as well: those groups are a way to the store, not where it lives.
    // Cloned after render() has written the row's state, so the copy carries it.
    const copy = (card) => {
      const li = document.createElement("li");
      li.append(card.cloneNode(true));
      set?.append(li);
    };

    const rest = kept.filter((c) => c !== active).sort((a, b) => distanceOf(a) - distanceOf(b));

    if (active) {
      group("Selected store", CHECK);
      copy(active);
    }

    if (rest.length) {
      group("Nearby stores", PIN);
      rest.slice(0, NEAR).forEach(copy);
    }

    // A to Z, groups and the stores inside them: this is the part of the list you
    // read by looking for a name rather than by distance, and the two above
    // already answer "which is close". localeCompare, so the sort holds for names
    // the ASCII order would put after z. Every kept store is here, the ones the
    // groups above shortcut to included.
    const regions = new Map();
    kept.forEach((card) => {
      const region = card.dataset.region || "Other";
      if (!regions.has(region)) regions.set(region, []);
      regions.get(region).push(card);
    });

    [...regions.keys()]
      .sort((a, b) => a.localeCompare(b))
      .forEach((region) => {
        group(region, "");
        regions
          .get(region)
          .sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
          .forEach(place);
      });

    if (emptyEl) emptyEl.hidden = kept.length > 0;

    if (was) {
      list.querySelector(`.pdp-store-row[data-store="${was}"]`)?.focus({ preventScroll: true });
    }
  };

  filters.forEach((f) => f.addEventListener("change", renderList));
  search?.addEventListener("input", renderList);

  const select = (card, { announce = false } = {}) => {
    active = card;
    window.exampleStore?.write(card?.dataset.store || "");
    renderAll();
    if (map && card) {
      map.flyTo(latLng(card), PICKED_ZOOM, { animate: !reduced.matches, duration: 0.6 });
    }
    // The line that changed is in the buy column, and the sheet closing takes
    // focus away from it, so the polite region says what it now reads.
    if (announce && status && card) {
      status.textContent = `${available(countOf(card))} at ${nameOf(card)}`;
    }
  };

  cards.forEach((card) => card.setAttribute("aria-pressed", "false"));

  // Chosen is the answer to the question the sheet asked, so it closes on it.
  const choose = (card) => {
    select(card, { announce: true });
    sheet.close();
  };

  // Delegated, not bound per row: the shortcut groups at the top of the list are
  // copies of rows that also sit under their region, so the thing pressed is not
  // always the element the marker and the state are keyed to. The store's own
  // name on the row is what resolves it back.
  list?.addEventListener("click", (e) => {
    const row = e.target.closest(".pdp-store-row");
    if (!row) return;
    const card = cards.find((c) => c.dataset.store === row.dataset.store);
    if (card) choose(card);
  });

  const initMap = () => {
    if (map || !window.L || !canvas) return;

    map = window.L.map(canvas, {
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: false,
      maxZoom: 20,
      minZoom: 4,
      // The sheet scrolls, so a wheel over the map belongs to the sheet.
      scrollWheelZoom: false,
      trackResize: false
    });

    mapEl.hidden = false;
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

    cards.forEach((card) => {
      const label = nameOf(card);
      const marker = window.L.marker(latLng(card), {
        icon: icon(card === active),
        keyboard: true,
        title: label,
        alt: label
      });
      // Straight to choose(), not through the row: every store keeps its pin,
      // including the ones the filters have taken out of the list, and a row
      // that isn't in the list is detached, so a click on it would bubble
      // nowhere.
      marker.on("click", () => choose(card));
      markers.set(card, marker);
      clusters ? clusters.addLayer(marker) : marker.addTo(map);
    });

    const zoom = [...sheet.querySelectorAll("[data-pdp-store-zoom]")];
    const syncZoom = () => {
      const z = map.getZoom();
      zoom.forEach((button) => {
        button.disabled =
          button.dataset.pdpStoreZoom === "in"
            ? z >= map.getMaxZoom() - 0.01
            : z <= map.getMinZoom() + 0.01;
      });
    };
    zoom.forEach((button) => {
      button.addEventListener("click", () => {
        map.setZoom(map.getZoom() + (button.dataset.pdpStoreZoom === "in" ? 1 : -1));
      });
    });
    map.on("zoomend", syncZoom);
    syncZoom();

    if (active) map.setView(latLng(active), PICKED_ZOOM, { animate: false });
    else fit();

    ready.then(() => {
      mapEl.dataset.ready = "";
    });

    // The sheet is display:none until it opens, so the box Leaflet measured is
    // not the one it ends up with. Refit once the size settles, unless a store
    // is chosen, in which case the view is that store and not the set.
    map.on("resize", () => {
      if (!active) fit();
    });
  };

  // Below 1024 the map is a panel over the rows and the bar raises it. From 1024
  // both panes are on screen and the bar is out of the way.
  //
  // No Leaflet, no map panel and nothing to switch to: the rows take the whole
  // picker rather than sharing it with an empty column. Read now rather than on
  // first open, since every map script is deferred ahead of this one and has
  // either arrived by now or isn't coming.
  if (!window.L && picker) picker.dataset.map = "off";

  // The panel rests with exactly its bar showing, so that height has to be the
  // real one: a hardcoded guess is a jump at both ends of every slide. Measured
  // whenever the box can change, since the bar's height follows the font.
  const measureSwitch = () => {
    if (!mapEl || !toggle) return;
    const bar = toggle.closest(".pdp-picker__switch") || toggle;
    mapEl.style.setProperty("--pdp-switch-h", `${bar.getBoundingClientRect().height}px`);
  };

  if (toggle) new ResizeObserver(measureSwitch).observe(toggle);

  const setView = (view) => {
    if (!picker) return;
    picker.dataset.view = view;
    if (toggle) toggle.setAttribute("aria-expanded", String(view === "map"));
    if (toggleLabel) toggleLabel.textContent = view === "map" ? "Show the list" : "Show on map";
  };

  // Crossing the breakpoint changes the panel from a column of the grid to a
  // sheet slid down out of the way, and the transition animates that: the map
  // slides off rather than simply not being there any more. CSS can't tell a
  // resize from a press, so the crossing says so itself and the move is cut for
  // the frames it takes to settle. The view goes back to the rows at the same
  // time, so coming back down never lands on a raised panel.
  const wide = matchMedia("(min-width: 1024px)");

  wide.addEventListener("change", () => {
    if (!picker) return;
    picker.dataset.resizing = "";
    picker.dataset.view = "list";
    requestAnimationFrame(() => {
      // The pane has just changed shape, and Leaflet is still holding the size it
      // measured in the other layout: it would paint one frame at the old
      // dimensions and correct itself when the basemap's trailing resize watch
      // catches up, which is the jump. Told now, while the frame is still blank.
      map?.invalidateSize({ animate: false });
      requestAnimationFrame(() => delete picker.dataset.resizing);
    });
  });

  toggle?.addEventListener("click", () => {
    setView(picker?.dataset.view === "map" ? "list" : "map");
  });

  // The scrim is the picker's own ::after, so a press that lands on it arrives
  // here with the picker as its target: anything inside the panel or the rows
  // reports itself instead.
  picker?.addEventListener("click", (e) => {
    if (e.target === picker && picker.dataset.view === "map") setView("list");
  });

  // Built on first open, whichever view is showing: the panel is laid out at its
  // full size even while it is slid down, so the map has a box to render into
  // before the reader asks for it and is drawn by the time it comes up.
  const scroller = sheet.querySelector(".pdp-picker__scroll");

  sheet.addEventListener("toggle", () => {
    if (!sheet.open) return;
    initMap();
    // The sheet is the same element every time, so it keeps whatever the last
    // visit left it scrolled to. Opening it is a fresh question, and the answer
    // starts with the chosen store at the top.
    if (scroller) scroller.scrollTop = 0;
  });

  // A store chosen on the listing (or here, last visit) is already the answer.
  const remembered = window.exampleStore?.read();
  const start = remembered && cards.find((c) => c.dataset.store === remembered);
  if (start) select(start);
  else renderAll();
})();
