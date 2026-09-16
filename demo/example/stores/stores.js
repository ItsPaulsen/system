// Store finder: the map, the filtering, and the bottom sheet's drag.
//
// The stores are the markup, not a data file. Each card carries its own
// coordinates, type, hours and contact details on data attributes, so the map
// builds its pins by reading the same list the panel shows, and there is no
// second copy to keep in sync. The detail view is one node filled from the card
// that opened it.
//
// Filtering has two modes. With nothing set, the cards sit in their region
// accordions. With a search or a filter on, the matches move into one flat list
// and the regions step aside, which is what lets "Near me" sort across them.
// Every pass starts by sending all the cards home, so the list is a function of
// the current query rather than an accumulation of the last few.
//
// The basemap comes from map.js, shared with the shop's store picker: it
// attaches the tile layer and keeps it on the page's theme. What stays here is
// what this page does on top of it, the pins, the framing and the panel.
(function () {
  const panel = document.querySelector("[data-stores-panel]");
  if (!panel) return;

  const regions = [...panel.querySelectorAll(".stores-region")];
  const cards = [...panel.querySelectorAll(".ex-store-row")];
  const search = panel.querySelector("[data-stores-search]");
  const nearest = panel.querySelector("[data-stores-nearest]");
  const openNow = panel.querySelector("[data-stores-open]");
  const count = panel.querySelector("[data-stores-count]");
  const results = panel.querySelector("[data-stores-results]");
  const detail = panel.querySelector("[data-stores-detail]");
  const back = panel.querySelector("[data-stores-back]");
  const scroll = panel.querySelector(".stores-panel__scroll");
  const detailScroll = panel.querySelector(".stores-detail__scroll");

  // Each card's home list, captured before anything moves, so leaving results
  // mode puts every card back in its own region and in its original order.
  const home = new Map(
    cards.map((card) => [card, { list: card.parentElement.parentElement, li: card.parentElement }])
  );
  const source = new Map(cards.map((card, i) => [card, i]));

  // Captured now, not read with closest() later: results mode moves a card out
  // of its region, so by then it has no region to look up.
  const region = new Map(
    cards.map((card) => [card, card.closest("[data-region]")?.dataset.region || ""])
  );

  // ── Map ───────────────────────────────────────────────────────────────────
  // Leaflet comes off a CDN, so everything map-shaped is guarded: if the script
  // never arrives the panel is still a working store list.
  const markers = new Map();
  let clusters = null; // the layer the pins actually live in, once clustering loaded
  let active = null; // store whose pin is open, and the only one shown while it is
  let lastFit = ""; // result set the map was last fitted to, so it isn't re-fitted for free
  let map = null;

  const latLng = (card) => [Number(card.dataset.lat), Number(card.dataset.lng)];

  // The panel covers the map's left edge on desktop and its bottom on mobile, so
  // every fit and fly pads for whichever one is in the way. Otherwise "zoom to
  // this store" lands the pin underneath the sheet.
  const padding = () => {
    if (matchMedia("(min-width: 1024px)").matches) {
      const box = panel.getBoundingClientRect();
      return { paddingTopLeft: [box.right + 24, 24], paddingBottomRight: [24, 24] };
    }
    // How much the sheet will cover once it has settled, not how much it covers
    // right now: the view is framed in the same breath as the sheet is told to
    // move, so its current rect is the position it is leaving.
    const covered = panel.offsetHeight - snaps[snap];
    return { paddingTopLeft: [24, 24], paddingBottomRight: [24, Math.max(24, covered + 24)] };
  };

  const mapEl = document.getElementById("stores-map");

  // The open pin is a different icon, not a class added to the rendered one:
  // clustering builds and rebuilds icon elements on its own schedule, so an
  // element that exists when the class is set may not be the one on screen.
  const icon = (on) =>
    window.L.divIcon({
      className: "",
      html: `<span class="ex-pin${on ? " ex-pin--active" : ""}">
               <span class="ex-pin__dot"></span>
             </span>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

  const initMap = () => {
    if (!window.L || !mapEl) return;

    // fadeAnimation off: Leaflet fades every tile up over ~200ms, and with the
    // ground already painted the tiles' own colour there is nothing for that
    // fade to reveal. It only shows up as a blink whenever the view changes.
    map = window.L.map("stores-map", {
      zoomControl: false,
      attributionControl: true,
      fadeAnimation: false,
      maxZoom: 20, // vector tiles keep rendering well past the raster ceiling

      // A floor too: without a globe to fall back on, zooming further out just
      // repeats a flat world sideways and leaves empty bands above and below it.
      minZoom: 4,

      // Leaflet's own resize tracking calls invalidateSize every 20ms while a
      // window is being dragged. Against a GL canvas each call reallocates the
      // drawing buffer, so the map blanks for a frame, over and over. The
      // observer below answers a settled size instead.
      trackResize: false
    });

    // The basemap, its theme swap and its resize watch, all of it shared with
    // the shop's store picker.
    window.exampleBasemap(map, mapEl);

    // Clustering is a second CDN script, so it's optional the same way Leaflet
    // is: without it the pins go straight on the map and everything else works.
    clusters = window.L.markerClusterGroup
      ? window.L.markerClusterGroup({
          showCoverageOnHover: false,
          maxClusterRadius: 56,

          // No spread-out flourish on the way in: the pins land where they land.
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
      const marker = window.L.marker(latLng(card), {
        icon: icon(false),
        keyboard: true,
        title: card.querySelector(".ex-store-row__name").textContent.trim(),
        alt: card.querySelector(".ex-store-row__name").textContent.trim()
      });
      marker.on("click", () => openDetail(card));
      markers.set(card, marker);
    });
    syncMarkers();

    // The zoom pair goes disabled at the limits rather than staying live and
    // doing nothing. Fractional zooms, hence the epsilon.
    const zoomButtons = [...document.querySelectorAll("[data-stores-zoom]")];
    const syncZoom = () => {
      const z = map.getZoom();
      zoomButtons.forEach((button) => {
        button.disabled =
          button.dataset.storesZoom === "in"
            ? z >= map.getMaxZoom() - 0.01
            : z <= map.getMinZoom() + 0.01;
      });
    };
    map.on("zoomend", syncZoom);
    syncZoom();

    fit();
  };

  const fit = () => {
    if (!map) return;
    const shown = cards.filter((card) => !card.hidden);
    const bounds = window.L.latLngBounds((shown.length ? shown : cards).map(latLng));
    map.fitBounds(bounds, { ...padding(), maxZoom: 13, animate: false });
  };

  // Frames a set of stores in whatever map is actually visible, which is why it
  // goes through padding(): the panel covers the left on desktop and the sheet
  // the bottom below it. maxZoom only caps zooming in, so passing the current
  // zoom means "zoom out as far as this needs, no closer".
  const frameStores = (set, zoom) => {
    if (!map || !set.length) return;
    const bounds = window.L.latLngBounds(set.map(latLng));
    // Leaflet derives the flight time from the distance travelled, which on a
    // jump across the map runs long enough to feel like waiting.
    const opts = { ...padding(), maxZoom: zoom, duration: 0.6 };
    if (reduced.matches) map.fitBounds(bounds, { ...opts, animate: false });
    else map.flyToBounds(bounds, opts);
  };

  const pinOf = (card) => markers.get(card)?.getElement()?.firstElementChild;

  // Which markers are on the map: the open store alone while one is open, so the
  // map answers "where is this" instead of "where is everything"; otherwise
  // whatever the filters left. Membership is touched only when it changes, since
  // re-adding a layer rebuilds its icon and blinks the map.
  const syncMarkers = () => {
    if (!markers.size) return;
    cards.forEach((card) => {
      const marker = markers.get(card);
      if (!marker) return;
      const show = active ? card === active : !card.hidden;
      const layer = clusters || map;
      const on = layer.hasLayer(marker);
      if (show && !on) layer.addLayer(marker);
      else if (!show && on) layer.removeLayer(marker);
    });
  };

  const setActive = (card) => {
    const prev = active;
    active = card;
    cards.forEach((c) => c.toggleAttribute("data-active", c === card));
    syncMarkers();

    // Only the two that changed, so the rest keep the elements they have.
    if (prev && prev !== card) markers.get(prev)?.setIcon(icon(false));
    if (card) markers.get(card)?.setIcon(icon(true));
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const matches = (card, query) => {
    if (openNow.checked && card.dataset.open !== "true") return false;
    if (!query) return true;
    // Name, street, place and the region it's filed under, so searching the group
    // name finds everything in it. Not the whole card's text: that would drag the
    // opening hours in, and "open" would match every store printing a closing
    // time.
    return `${card.querySelector(".ex-store-row__name").textContent} ${
      card.querySelector(".ex-store-row__address").textContent
    } ${card.dataset.city} ${region.get(card)}`
      .toLowerCase()
      .includes(query);
  };

  const apply = () => {
    const query = search.value.trim().toLowerCase();
    const filtered = Boolean(query) || openNow.checked || nearest.checked;

    const shown = cards.filter((card) => {
      const hit = matches(card, query);
      card.hidden = !hit;
      return hit;
    });

    // Every pass starts by sending all the cards home, in source order, so the
    // regions keep the A-Z the markup describes and the flat list is left empty.
    // Without the reset, appending only the matches leaves the previous query's
    // cards sitting in the list: narrowing "r" to "ro" would print no results and
    // still show the six that matched "r".
    cards.forEach((card) => {
      const { list, li } = home.get(card);
      list.append(li);
    });

    // Results mode is one flat list, so the matching cards move into it. Nearest
    // sorts that list by distance; anything else keeps the regions' own A-Z.
    if (filtered) {
      const order = [...shown];
      if (nearest.checked) {
        order.sort((a, b) => Number(a.dataset.distance) - Number(b.dataset.distance));
      } else {
        order.sort((a, b) => source.get(a) - source.get(b));
      }
      results.append(...order.map((card) => home.get(card).li));
    }

    // Also hidden when nothing matched: an empty box is still 8px of white
    // under the count line.
    results.hidden = !filtered || shown.length === 0;
    panel.dataset.mode = filtered ? "results" : "regions";

    // Counted only for a search, where the number answers "did that find
    // anything". The chips don't need it: Near me sorts rather than filters, and
    // Open now leaves a list you can read the length of.
    count.textContent = "";
    if (query) {
      // Built as nodes rather than a string: the term is whatever was typed, and
      // it goes in as text, never as markup.
      const term = document.createElement("strong");
      term.className = "stores-panel__term";
      term.textContent = search.value.trim();
      count.append(`${shown.length} ${shown.length === 1 ? "result" : "results"} for "`, term, '"');
    }

    // The map is only re-fitted when the result set itself differs from last
    // time, so typing doesn't re-frame it on every keystroke.
    if (markers.size) {
      syncMarkers();

      const key = shown.map((card) => card.dataset.store).join(",");
      if (shown.length && key !== lastFit) {
        lastFit = key;
        opened = null; // a different result set, so there is nothing to go back to
        fit();
      }
    }

    lockScrollers(); // a shorter list can stop scrolling, and then it stops owning the touch
  };

  // ── Detail ────────────────────────────────────────────────────────────────
  let backMode = "regions"; // mode to restore when the detail view is closed
  let opened = null; // store whose detail was last open, re-centred on the way back

  const fill = (selector, text) => {
    const el = detail.querySelector(selector);
    if (el) el.textContent = text;
  };

  const openDetail = (card) => {
    const d = card.dataset;
    fill("[data-detail-name]", card.querySelector(".ex-store-row__name").textContent.trim());
    fill(
      "[data-detail-address]",
      `${card.querySelector(".ex-store-row__address").textContent.trim()}, ${d.city}`
    );
    // The row says it in one line ("Open until 20:00"), and this summary wants to
    // drop everything after the state word once the hours list below is open, so
    // it is split here: the word off data-open, the remainder off the line. Split
    // rather than kept as two spans in the row, since out there it is one fact and
    // reads as one.
    const line = card.querySelector(".ex-store-row__status").textContent.trim();
    const word = d.open === "true" ? "Open" : "Closed";
    const state = document.createElement("span");
    state.textContent = word;
    const rest = document.createElement("span");
    rest.className = "stores-detail__hours-rest";
    rest.textContent = line.startsWith(word) ? line.slice(word.length) : ` ${line}`;
    detail.querySelector("[data-detail-status]").replaceChildren(state, rest);

    // Seven rows starting at today and wrapping round, today set in the emphasized
    // weight: the row you want is the one you're standing on, and a fixed Mon-Sun
    // list makes you find it.
    const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const hoursFor = (i) => (i === 6 ? d.hoursSat : i === 0 ? d.hoursSun : d.hoursWeekday);
    const today = new Date().getDay();

    const hours = detail.querySelector("[data-detail-hours]");
    hours.textContent = "";
    for (let n = 0; n < 7; n += 1) {
      const i = (today + n) % 7;
      const dt = document.createElement("dt");
      dt.textContent = DAYS[i];
      const dd = document.createElement("dd");
      dd.textContent = hoursFor(i);
      if (n === 0) {
        dt.className = "stores-detail__today";
        dd.className = "stores-detail__today";
      }
      hours.append(dt, dd);
    }

    const site = detail.querySelector("[data-detail-site]");
    site.textContent = d.site;
    const phone = detail.querySelector("[data-detail-phone]");
    phone.textContent = d.phone;
    phone.href = `tel:${d.phone.replace(/\s/g, "")}`;
    const email = detail.querySelector("[data-detail-email]");
    email.textContent = d.email;
    email.href = `mailto:${d.email}`;

    backMode = panel.dataset.mode;
    panel.dataset.mode = "detail";
    detail.hidden = false;
    setActive(card);

    opened = card;
    renderChosen();
    // Snap first: padding() frames against where the sheet is going.
    if (!desktop.matches) snapTo(1);
    frameStores([card], 15);
    detail.querySelector("[data-detail-name]").focus({ preventScroll: true });
  };

  const closeDetail = () => {
    detail.hidden = true;
    setActive(null); // back to the list is back to no selection, so the pin drops to its rest size
    // Nothing about the filters changed, so this is a mode switch and nothing
    // else. Running apply() here would re-fit the map and blink it for a click
    // that only asked to go back to the list.
    panel.dataset.mode = backMode;

    // Back to the group the store came from, not to the store: its region while
    // browsing, the result set while a search is on. Capped at the zoom already
    // on screen, so a group of one just stays where it is.
    if (opened && map) {
      const peers =
        backMode === "regions"
          ? cards.filter((c) => !c.hidden && region.get(c) === region.get(opened))
          : cards.filter((c) => !c.hidden);
      frameStores(peers, map.getZoom());
    }

    lockScrollers();
  };

  // ── Chosen store ──────────────────────────────────────────────────────────
  // Which shop the whole example answers for, shared with the listing and the
  // product page through store.js. This is the page the stores are described on,
  // so it is where the choice is made and unmade; the other two only read it
  // back and narrow themselves to it.
  const mine = detail.querySelector("[data-detail-mine]");
  const mineLabel = detail.querySelector("[data-detail-mine-label]");
  const toShop = detail.querySelector("[data-detail-shop]");

  // The same filled check the product page's picker heads its chosen group with.
  const CHECK =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17 3.34a10 10 0 ' +
    "1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336zm-1.293 5.953a1 1 0 0 0 " +
    "-1.32 -.083l-.094 .083l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.403 1.403l.083 " +
    '.094l2 2l.094 .083a1 1 0 0 0 1.226 0l.094 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" /></svg>';

  const chosen = () => window.exampleStore?.read() || "";

  // Written onto the row rather than left in the markup: it is a fact about the
  // reader, not about the shop, so no row carries it until the choice says so.
  // Touched only where it changes, since the rows move between lists on every
  // filter pass and a rebuilt mark would churn with them.
  const markRows = () => {
    const slug = chosen();
    cards.forEach((card) => {
      const had = card.querySelector(".ex-store-row__mine");
      const on = card.dataset.store === slug;
      if (on === Boolean(had)) return;
      if (!on) {
        had.remove();
        return;
      }
      const mark = document.createElement("span");
      mark.className = "ex-store-row__mine";
      mark.innerHTML = CHECK;
      mark.append("Your store");
      card.querySelector(".ex-store-row__content").prepend(mark);
    });
  };

  // One pass over both views of the choice: the mark on the rows, and the button
  // in the detail, which is the same control either way round.
  const renderChosen = () => {
    markRows();
    if (!mine) return;
    const on = Boolean(opened) && opened.dataset.store === chosen();
    mine.setAttribute("aria-pressed", String(on));
    mine.classList.toggle("button--with-start-icon", on);
    if (mineLabel) mineLabel.textContent = on ? "Your store" : "Make this my store";
  };

  mine?.addEventListener("click", () => {
    if (!opened) return;
    const on = mine.getAttribute("aria-pressed") === "true";
    window.exampleStore?.write(on ? "" : opened.dataset.store);
    renderChosen();
  });

  // "What's in stock" is a question about the shop whose page it is pressed on,
  // and the listing answers it by reading the chosen store on arrival. So the
  // press says which shop it means before it leaves.
  toShop?.addEventListener("click", () => {
    if (opened) {
      window.exampleStore?.write(opened.dataset.store);
    }
  });

  // ── Sheet ─────────────────────────────────────────────────────────────────
  // Three snaps, measured rather than guessed: full (0), the mock's resting
  // offset, and a peek that leaves exactly the search + filters above the fold.
  const grab = panel.querySelector("[data-stores-grab]");
  const filters = panel.querySelector(".stores-filters");
  const desktop = matchMedia("(min-width: 1024px)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let snaps = [0, 0, 0];
  let snap = 1;

  // The sheet stops 8px short of the header rather than flush against it, so the
  // fullest snap still reads as a sheet sitting on the page.
  const TOP = 8;

  const measure = () => {
    const h = panel.offsetHeight;

    // Peek leaves the search and filters above the fold. Measured off the
    // filters' own box rather than a wrapper's height, because the head is part
    // of the scroller now and no single element is "the header". Both rects sit
    // in the same transformed subtree, so the sheet's own offset cancels out;
    // the scroll position doesn't, hence the scrollTop.
    const bottom = filters
      ? filters.getBoundingClientRect().bottom -
        panel.getBoundingClientRect().top +
        (scroll ? scroll.scrollTop : 0) +
        16
      : grab.offsetHeight;

    snaps = [TOP, Math.round(h * 0.22), Math.max(TOP, h - bottom)];
    if (snaps[1] > snaps[2]) snaps[1] = Math.round(snaps[2] / 2);
  };

  // A scroller only owns the touch when it has somewhere to scroll. The detail
  // usually fits the full snap, and a scroller with nothing to scroll was still
  // claiming the gesture and cancelling the drag, so the sheet could only be
  // pulled by its handle there. Flagged in the DOM because the lock that frees
  // the gesture is touch-action, which has to be set before the touch lands.
  const lockScrollers = () => {
    [scroll, detailScroll].filter(Boolean).forEach((el) => {
      // Measured against the bottom padding, not against zero: that padding is
      // clearance for the browser's bottom bar, so a scroller with nothing under
      // the fold but its own empty room has nowhere to scroll and should say so.
      const clearance = parseFloat(getComputedStyle(el).paddingBottom) || 0;
      el.toggleAttribute("data-fits", el.scrollHeight - el.clientHeight <= clearance + 1);
    });
  };

  const setOffset = (px) => panel.style.setProperty("--sheet-y", `${px}px`);

  // Settling is a spring, not a duration. The reference sheet runs react-spring
  // on its default preset, so these are those numbers; the whole feel of the
  // thing lives here, and swapping in another of its presets (stiff 210/20,
  // gentle 120/14) is a two-number change.
  const SPRING = { tension: 170, friction: 26, mass: 1 };
  let springTo = 0;
  let springAt = 0;
  let springV = 0;
  let frame = null;

  const tick = (now) => {
    const dt = Math.min(0.064, (now - (tick.last || now)) / 1000); // cap, so a backgrounded tab can't launch it
    tick.last = now;
    const a = (-SPRING.tension * (springAt - springTo) - SPRING.friction * springV) / SPRING.mass;
    springV += a * dt;
    springAt += springV * dt;
    if (Math.abs(springAt - springTo) < 0.1 && Math.abs(springV) < 0.5) {
      springAt = springTo;
      springV = 0;
      frame = null;
      setOffset(springAt);
      return;
    }
    setOffset(springAt);
    frame = requestAnimationFrame(tick);
  };

  // Release velocity carries into the spring, so a flick keeps going instead of
  // restarting from rest at the new target.
  const springStart = (target, velocity) => {
    springTo = target;
    springV = velocity * 1000; // px/ms from the pointer, px/s for the integrator
    if (reduced.matches) {
      springAt = target;
      setOffset(target);
      return;
    }
    if (frame === null) {
      tick.last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };

  const snapTo = (i, velocity) => {
    snap = Math.min(snaps.length - 1, Math.max(0, i));
    // Drives the scroll lock in stores.css: the list only scrolls at the full
    // snap, so below it the sheet can take a drag started anywhere on it.
    panel.dataset.snap = snap === 0 ? "full" : "partial";
    lockScrollers();
    springStart(snaps[snap], velocity || 0);
  };

  let dragFrom = null;
  let dragStart = 0;
  let lastY = 0;
  let lastT = 0;
  let velocity = 0; // px/ms, signed the same way as the offset

  // Past either end the sheet still moves, but against resistance. This is the
  // rubberband curve from @use-gesture (the library the reference sheet is built
  // on), at its own 0.15 constant: asymptotic rather than capped, so the give
  // approaches 0.15x the sheet's travel and never quite reaches it. Dragging up
  // therefore runs the sheet over the topbar, which is the give a sheet is
  // expected to have; the release below still lands it under the header.
  const RUBBER = 0.15;
  const resist = (over, range) =>
    range === 0 ? Math.pow(over, 5 * RUBBER) : (over * range * RUBBER) / (range + RUBBER * over);

  const offsetFor = (raw) => {
    const min = snaps[0];
    const max = snaps[2];
    const range = max - min;
    if (raw < min) return min - resist(min - raw, range);
    if (raw > max) return max + resist(raw - max, range);
    return raw;
  };

  // A drag that starts on a scroller passes that scroller in, and once the sheet
  // has run out of travel the rest of the pull becomes its scroll: one gesture
  // takes the sheet to full and keeps reading, instead of stopping at the top
  // and asking for a second swipe. Only upward, and only away from the handle:
  // past the bottom the rubberband is still the right answer.
  const onMove = (e, carrier) => {
    if (dragFrom === null) return;
    const dt = e.timeStamp - lastT;
    if (dt > 0) velocity = (e.clientY - lastY) / dt;
    lastY = e.clientY;
    lastT = e.timeStamp;
    const raw = dragStart + (e.clientY - dragFrom);
    if (carrier) {
      // Written on every move, not only past the top, so dragging back down
      // unwinds the scroll before the sheet follows: the gesture is reversible.
      const over = snaps[0] - raw;
      carrier.scrollTop = Math.max(0, over);
      if (over > 0) {
        // The sheet is parked, so it carries no throw into the release.
        velocity = 0;
        springAt = snaps[0];
        setOffset(springAt);
        return;
      }
    }
    springAt = offsetFor(raw);
    setOffset(springAt);
  };

  const onUp = (e) => {
    if (dragFrom === null) return;
    // Snapping reads the un-resisted position clamped back into range, so an
    // overdrag settles at the nearest real snap instead of somewhere past it.
    const at = Math.min(snaps[2], Math.max(snaps[0], dragStart + (e.clientY - dragFrom)));
    dragFrom = null;
    panel.removeAttribute("data-dragging");

    // Nearest snap to where the throw is *heading*, not where the finger left
    // off: a short lift settles back, a flick carries to the next stop even
    // from a few pixels in. LOOKAHEAD is how far ahead of the release we look.
    const LOOKAHEAD = 120;
    const projected = Math.min(snaps[2], Math.max(snaps[0], at + velocity * LOOKAHEAD));
    let best = 0;
    snaps.forEach((value, i) => {
      if (Math.abs(value - projected) < Math.abs(snaps[best] - projected)) best = i;
    });
    snapTo(best, velocity);
    velocity = 0;
  };

  const startDrag = (e) => {
    if (desktop.matches) return;
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
    dragFrom = e.clientY;
    dragStart = springAt;
    lastY = e.clientY;
    lastT = e.timeStamp;
    velocity = 0;
    panel.setAttribute("data-dragging", "");
    e.target.setPointerCapture?.(e.pointerId);
  };

  grab.addEventListener("pointerdown", startDrag);
  grab.addEventListener("pointermove", onMove);
  grab.addEventListener("pointerup", onUp);
  grab.addEventListener("pointercancel", onUp);

  // The sheet is draggable by its whole surface, not just the handle, and in both
  // views: the list and the detail each have their own scroller. Below the full
  // snap neither is scrolling (stores.css locks them), so a drag starting
  // anywhere belongs to the sheet. At the full snap the scroller owns the
  // gesture, except a pull down from the very top, which is how you close it.
  [scroll, detailScroll].filter(Boolean).forEach((el) => {
    el.addEventListener(
      "pointerdown",
      (e) => {
        if (desktop.matches || e.pointerType === "mouse") return;
        // Recounted here as well as on every change that can move it: the flag
        // decides who owns this gesture, and it has to be true of the list as it
        // stands right now, not as it stood when it was last measured.
        lockScrollers();
        if (snap === 0 && !el.hasAttribute("data-fits") && el.scrollTop > 0) return;
        startDrag(e);
      },
      { passive: true }
    );

    el.addEventListener(
      "pointermove",
      (e) => {
        if (dragFrom === null) return;
        // At full, only a downward pull counts; scrolling back up is the list's.
        if (snap === 0 && !el.hasAttribute("data-fits") && e.clientY - dragFrom <= 4) return;
        onMove(e, el.hasAttribute("data-fits") ? null : el);
      },
      { passive: true }
    );

    el.addEventListener("pointerup", onUp, { passive: true });
    el.addEventListener("pointercancel", onUp, { passive: true });
  });

  const resize = () => {
    measure();
    lockScrollers();
    if (!desktop.matches) {
      springAt = snaps[snap];
      springTo = springAt;
      setOffset(springAt);
    } else {
      panel.style.removeProperty("--sheet-y");
    }
    // No invalidateSize here: the ResizeObserver above already answers a changed
    // map box, and calling it from both is what made a window drag flicker.
  };

  // See .stores-panel[data-settling] in stores.css: hover is suppressed for as
  // long as the reflow after a region opens takes to land. The flag goes up on
  // the summary's click, not on the <details> toggle event, because toggle is
  // queued and would land after the reflow it is meant to cover.
  let settling;
  const settle = () => {
    panel.dataset.settling = "";
    clearTimeout(settling);
    settling = setTimeout(() => {
      delete panel.dataset.settling;
      // An opened region is the one thing that turns a list that fits into one
      // that scrolls, and it does it on an animation, so the recount waits for
      // the reflow the flag above is already covering.
      lockScrollers();
    }, 200);
  };

  regions.forEach((group) => {
    group.querySelector(".accordion__summary")?.addEventListener("click", settle);

    group.addEventListener("toggle", () => {
      settle(); // keyboard, and any programmatic open

      // Opening a region frames its stores, the same view Back gives you after
      // closing one of them. Only on the way open, and only while browsing: in
      // results mode the regions aren't what the list is showing.
      if (!group.open || panel.dataset.mode !== "regions") return;
      frameStores(
        [...group.querySelectorAll(".ex-store-row")].filter((card) => !card.hidden),
        14
      );
    });
  });

  // ── Wiring ────────────────────────────────────────────────────────────────
  cards.forEach((card) => {
    card.addEventListener("click", () => openDetail(card));

    // Hovering a row grows its pin, so the list and the map point at each other.
    // mouseenter/mouseleave rather than the pointer events: a tap fires those
    // too and would leave a pin stuck at hover size on a touch screen.
    card.addEventListener("mouseenter", () => pinOf(card)?.classList.add("ex-pin--hover"));
    card.addEventListener("mouseleave", () => pinOf(card)?.classList.remove("ex-pin--hover"));
  });
  back.addEventListener("click", closeDetail);

  // The hours accordion is the detail's version of a region opening: it is the
  // one thing that can turn a detail that fits into one that scrolls. Counted
  // twice because it opens on an animation, so the height at the toggle is not
  // the height it settles at.
  detail.querySelector(".stores-detail__hours")?.addEventListener("toggle", () => {
    lockScrollers();
    setTimeout(lockScrollers, 200);
  });

  // Focusing the search below 1024 opens the sheet: you are about to type and
  // read results, and the peek snap leaves room for about one. This is the same
  // move the handle used to make on a tap, which is exactly where it was wrong:
  // here it follows an intent, there it followed a misfire.
  search.addEventListener("focus", () => {
    if (!desktop.matches) snapTo(0);
  });

  search.addEventListener("input", apply);
  nearest.addEventListener("change", apply);
  openNow.addEventListener("change", apply);
  document.querySelectorAll("[data-stores-zoom]").forEach((button) => {
    button.addEventListener("click", () => {
      if (map) map[button.dataset.storesZoom === "in" ? "zoomIn" : "zoomOut"]();
    });
  });

  window.addEventListener("resize", resize);
  desktop.addEventListener("change", resize);

  initMap();
  renderChosen();
  measure();
  lockScrollers();
  springAt = snaps[1];
  snapTo(1);
  apply();
})();
