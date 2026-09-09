// Product page: the colour swatches own the variant, so everything that differs
// between colourways (name, price, stock, store count, and every image in the
// gallery) is read off the checked radio rather than kept in a table here. The
// radios do the selection themselves; this only renders what follows from it.
(function () {
  const inputs = Array.from(document.querySelectorAll(".pdp-swatch__input"));
  if (!inputs.length) return;

  const out = {
    color: document.querySelector("[data-pdp-color]"),
    variant: document.querySelector("[data-pdp-variant]"),
    price: document.querySelector("[data-pdp-price]"),
    stores: document.querySelector("[data-pdp-stores]"),
    badge: document.querySelector("[data-pdp-stock-badge]"),
    stock: document.querySelector("[data-pdp-stock-label]"),
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

  // Two stock states, each a badge skin plus the lead time it implies.
  const STOCK = {
    in: { skin: "badge--green", label: "In stock", lead: "Ships in 2-4 days" },
    order: { skin: "badge--amber", label: "Made to order", lead: "Ships in 6-8 weeks" }
  };

  const set = (el, text) => {
    if (el) el.textContent = text;
  };

  const render = (input) => {
    const d = input.dataset;
    set(out.color, d.color);
    // The colour is part of the product's name as well as the picker's value, so
    // the title carries it. Lowercased in CSS, not here, since the picker shows
    // the same string capitalised.
    set(out.variant, `, ${d.color}`);
    set(out.price, d.price);
    set(out.stores, d.stores);

    const stock = STOCK[d.stock] || STOCK.in;
    set(out.stock, stock.label);
    set(out.lead, stock.lead);
    if (out.badge) {
      out.badge.classList.remove("badge--green", "badge--amber");
      out.badge.classList.add(stock.skin);
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
      // Wrapping is worth having wherever there's more than one shot: the rail (or
      // the dots) says where you are, so an end carries no information, and the
      // arrows stop vanishing under the pointer. At one view there is nowhere to
      // go, and a loop would leave two arrows that do nothing.
      if (views > 1) gallery.dataset.carouselLoop = "";
      else delete gallery.dataset.carouselLoop;
    }

    // Back to the pack shot: the colour that was picked is the one to show, and a
    // track left translated onto a slide that has just been hidden would park the
    // gallery on nothing. Placed, not slid: animating it reads as the new colour
    // arriving from the side rather than as the gallery resetting.
    if (gallery) {
      gallery.dispatchEvent(
        new CustomEvent("carousel:goto", { detail: { index: 0, animate: false } })
      );
    }

    // The carousel measures its track live but only re-reads it on resize, so the
    // slides that just appeared or left need one to be counted.
    window.dispatchEvent(new Event("resize"));
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
    const SENDING = 700;
    const CONFIRMING = 1400;

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
      add.classList.add("button--loading");
      add.setAttribute("aria-busy", "true");
      add.setAttribute("aria-disabled", "true");

      setTimeout(() => {
        add.classList.remove("button--loading");
        add.removeAttribute("aria-busy");
        // The check is a start icon while it's there, so the pair sits on the
        // same inset as any other icon-and-label button.
        add.classList.add("is-added", "button--with-start-icon");
        // Written past the idle guard: this *is* the state.
        addLabel.textContent = "Added";

        setTimeout(() => {
          add.classList.remove("is-added", "button--with-start-icon");
          add.removeAttribute("aria-disabled");
          label();
        }, CONFIRMING);
      }, SENDING);
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
        railView.scrollBy({ top: Number(b.dataset.pdpRailStep) * tile() * 3, behavior: "smooth" });
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
    let stand = null;
    const enter = () => {
      // Already in the panel: the photograph carries the open hook with it, so a
      // click on it in there matches too. Without this that click stood a second
      // copy up on the page, and only the newest one was ever taken down again.
      if (gallery.parentNode === slot) return;
      const current = gallery.querySelector('[data-carousel-goto][aria-current="true"]');
      from = current ? Number(current.dataset.carouselGoto) : 0;
      stand = gallery.cloneNode(true);
      stand.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
      stand.inert = true;
      stand.setAttribute("aria-hidden", "true");
      home.insertBefore(stand, next);
      slot.append(gallery);
      remeasure();
    };
    const leave = () => {
      home.insertBefore(gallery, next);
      stand?.remove();
      stand = null;
      remeasure();
      // After the move, so the track is measured against the page's own width, and
      // placed rather than slid: the page shouldn't animate to a slide it never
      // left. This also puts the index the resize re-snaps to back where it was.
      gallery.dispatchEvent(
        new CustomEvent("carousel:goto", { detail: { index: from, animate: false } })
      );
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
})();

// The related row is a scroll container rather than a carousel: its cards are the
// listing's own, and their three subgrid rows (what keeps titles and prices on
// shared lines) only resolve inside a grid, which a flex track isn't. Touch
// already scrolls it, so this is the pointer drag and the hover arrows, so it
// answers a mouse the way the gallery does. Neither one snaps mid-move: a
// fixed-width shelf is pushed along, not stepped between slides. Both only tidy
// up at the end, landing on the nearest card boundary.
(function () {
  const row = document.querySelector(".pdp-related__grid");
  if (!row) return;

  const shelf = row.closest(".pdp-related__shelf");
  const prev = shelf?.querySelector(".carousel__control--prev");
  const next = shelf?.querySelector(".carousel__control--next");

  const RESIST = 0.3; // the fraction of an overpull that shows, as in the carousel

  let down = false;
  let startX = 0;
  let startLeft = 0;
  let moved = false;
  let frame;
  let pull = 0;

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
    prev.hidden = max <= 1 || at <= 1;
    next.hidden = max <= 1 || at >= max - 1;
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
    const ms = Math.min(420, 140 + Math.max(Math.abs(dist), Math.abs(fromPull)) * 0.6);
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

  // Let go and the nearest card lands flush with the row's start, so what you see
  // is whole cards and one peeking. At either end it stays where it is: the row is
  // already against something, and pulling it off that edge to align a card would
  // undo the drag. It still glides, to let any overpull go.
  const settle = () => {
    const max = row.scrollWidth - row.clientWidth;
    const at = row.scrollLeft;
    if (at <= 1 || at >= max - 1) {
      glide(at);
      return;
    }
    const near = stops().reduce(
      (best, o) => (Math.abs(o - at) < Math.abs(best - at) ? o : best),
      0
    );
    glide(Math.max(0, Math.min(max, near)));
  };

  row.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.pointerType !== "mouse") return;
    cancelAnimationFrame(frame); // taking hold of a row still settling
    down = true;
    moved = false;
    startX = e.clientX;
    startLeft = row.scrollLeft;
    row.setPointerCapture(e.pointerId);
    row.classList.add("is-dragging");
    e.preventDefault(); // the cards are links: stop the native drag-and-drop
  });

  row.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 3) moved = true;
    const max = row.scrollWidth - row.clientWidth;
    const want = startLeft - dx;
    const to = Math.max(0, Math.min(max, want));
    row.scrollLeft = to;
    // Whatever the scroll couldn't take is the overpull, resisted.
    setPull((to - want) * RESIST);
  });

  const endDrag = (e) => {
    if (!down) return;
    down = false;
    row.releasePointerCapture?.(e.pointerId);
    row.classList.remove("is-dragging");
    if (!moved) {
      if (pull) glide(row.scrollLeft);
      return;
    }
    settle();
    // Let go over a card and the click would follow its link. preventDefault
    // alone wouldn't do: the cards are anchors, but a page could bind a listener
    // to them too, so stop the event as well (same as the carousel's own guard).
    const swallow = (c) => {
      c.preventDefault();
      c.stopPropagation();
    };
    row.addEventListener("click", swallow, { capture: true });
    requestAnimationFrame(() => row.removeEventListener("click", swallow, { capture: true }));
  };

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
