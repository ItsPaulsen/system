// Store finder: the map, the filtering, and the bottom sheet's drag.
//
// The stores are the markup, not a data file. Each card carries its own
// coordinates, type, hours and contact details on data attributes, so the map
// builds its pins by reading the same list the panel shows, and there is no
// second copy to keep in sync. The detail view is one node filled from the card
// that opened it.
//
// Filtering never moves a node. apply() hides the cards that don't match and
// flips the panel's data-mode; results mode is a CSS change (stores.css) that
// flattens the region tree, which is also what lets "Nearest you" reorder the
// whole set with a `order` per card.
(function () {
  const panel = document.querySelector("[data-stores-panel]");
  if (!panel) return;

  const regions = [...panel.querySelectorAll(".stores-region")];
  const cards = [...panel.querySelectorAll(".stores-card")];
  const search = panel.querySelector("[data-stores-search]");
  const nearest = panel.querySelector("[data-stores-nearest]");
  const openNow = panel.querySelector("[data-stores-open]");
  const count = panel.querySelector("[data-stores-count]");
  const empty = panel.querySelector("[data-stores-empty]");
  const results = panel.querySelector("[data-stores-results]");
  const detail = panel.querySelector("[data-stores-detail]");
  const back = panel.querySelector("[data-stores-back]");
  const scroll = panel.querySelector(".stores-panel__scroll");

  // Each card's home list, captured before anything moves, so leaving results
  // mode puts every card back in its own region and in its original order.
  const home = new Map(
    cards.map((card) => [card, { list: card.parentElement.parentElement, li: card.parentElement }])
  );
  const source = new Map(cards.map((card, i) => [card, i]));

  // ── Map ───────────────────────────────────────────────────────────────────
  // Leaflet comes off a CDN, so everything map-shaped is guarded: if the script
  // never arrives the panel is still a working store list.
  const markers = new Map();
  let lastFit = ""; // result set the map was last fitted to, so it isn't re-fitted for free
  let map = null;
  let tiles = null;
  let tileUrl = "";

  // Label-free grey basemaps, so our pins are the only labels on the map and the
  // demo's made-up place names aren't sitting next to real ones. Esri's canvas
  // tiles need no key; CARTO's look the same but stamp "API KEY REQUIRED" across
  // every unauthenticated tile.
  const TILES = {
    light:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/" +
      "World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    dark:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/" +
      "World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
  };

  const latLng = (card) => [Number(card.dataset.lat), Number(card.dataset.lng)];

  // The panel covers the map's left edge on desktop and its bottom on mobile, so
  // every fit and fly pads for whichever one is in the way. Otherwise "zoom to
  // this store" lands the pin underneath the sheet.
  const padding = () => {
    const desktop = matchMedia("(min-width: 1024px)").matches;
    if (desktop) {
      const box = panel.getBoundingClientRect();
      return { paddingTopLeft: [box.right + 24, 24], paddingBottomRight: [24, 24] };
    }
    const visible = window.innerHeight - panel.getBoundingClientRect().top;
    return { paddingTopLeft: [24, 24], paddingBottomRight: [24, Math.max(24, visible + 24)] };
  };

  const mapEl = document.getElementById("stores-map");

  const initMap = () => {
    if (!window.L || !mapEl) return;

    // fadeAnimation off: Leaflet fades every tile up over ~200ms, and with the
    // ground already painted the tiles' own colour there is nothing for that
    // fade to reveal. It only shows up as a blink whenever the view changes.
    map = window.L.map("stores-map", {
      zoomControl: false,
      attributionControl: true,
      fadeAnimation: false
    });
    tileUrl = TILES[document.documentElement.dataset.theme] || TILES.light;
    tiles = window.L.tileLayer(tileUrl, {
      maxZoom: 16, // the canvas basemaps stop here; past it Leaflet would ask for tiles that 404
      attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
    }).addTo(map);

    cards.forEach((card) => {
      const marker = window.L.marker(latLng(card), {
        icon: window.L.divIcon({
          className: "",
          html: '<span class="stores-pin"><span class="stores-pin__dot"></span></span>',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        }),
        keyboard: true,
        title: card.querySelector(".stores-card__name").textContent.trim(),
        alt: card.querySelector(".stores-card__name").textContent.trim()
      });
      marker.on("click", () => openDetail(card));
      markers.set(card, marker);
      marker.addTo(map);
    });

    fit();

    // Leaflet caches the container's size at init, and at that point the page is
    // still settling (web font, sticky topbar, the sheet's own measure pass). A
    // stale size leaves its controls positioned against a box taller than the one
    // now drawn, so the attribution ends up clipped off the bottom edge. Watching
    // the element covers every cause of a resize, including the ones no window
    // event fires for.
    new ResizeObserver(() => map.invalidateSize({ animate: false })).observe(mapEl);

    // Dark theme is a token swap everywhere else on the site; the basemap is the
    // one thing that needs telling, so it follows data-theme the same way.
    new MutationObserver(() => {
      const url = TILES[document.documentElement.dataset.theme] || TILES.light;
      if (tiles && url !== tileUrl) {
        tileUrl = url;
        tiles.setUrl(url);
      }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  };

  const fit = () => {
    if (!map) return;
    const shown = cards.filter((card) => !card.hidden);
    const bounds = window.L.latLngBounds((shown.length ? shown : cards).map(latLng));
    map.fitBounds(bounds, { ...padding(), maxZoom: 13, animate: false });
  };

  // Both the detail open and the return to the list put one store in the middle
  // of whatever map is actually visible, which is why this goes through
  // padding() rather than a plain panTo: the panel covers the left on desktop
  // and the sheet covers the bottom below it.
  const centreOn = (card, zoom) => {
    if (!map) return;
    const at = window.L.latLngBounds([latLng(card), latLng(card)]);
    const opts = { ...padding(), maxZoom: zoom };
    if (reduced.matches) map.fitBounds(at, { ...opts, animate: false });
    else map.flyToBounds(at, opts);
  };

  const setActive = (card) => {
    cards.forEach((c) => {
      const on = c === card;
      c.toggleAttribute("data-active", on);
      const pin = markers.get(c)?.getElement()?.firstElementChild;
      if (pin) pin.classList.toggle("stores-pin--active", on);
    });
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const matches = (card, query) => {
    if (openNow.checked && card.dataset.open !== "true") return false;
    if (!query) return true;
    // Name and place only, which is what the field offers. The whole card's text
    // would drag the opening hours in with it, so "open" would match every store
    // that prints a closing time.
    return `${card.querySelector(".stores-card__name").textContent} ${
      card.querySelector(".stores-card__city").textContent
    }`
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

    results.hidden = !filtered;
    panel.dataset.mode = filtered ? "results" : "regions";

    empty.hidden = shown.length > 0;
    count.textContent = filtered
      ? `${shown.length} ${shown.length === 1 ? "store" : "stores"}${query ? ` for "${search.value.trim()}"` : ""}`
      : "";

    // Marker churn is what makes the map blink: re-adding a layer rebuilds its
    // icon element and re-runs the tile fade. So each marker is only touched
    // when its membership actually changes, and the map is only re-fitted when
    // the result set itself is different from last time.
    if (markers.size) {
      cards.forEach((card) => {
        const marker = markers.get(card);
        if (!marker) return;
        const on = map.hasLayer(marker);
        if (card.hidden && on) marker.remove();
        else if (!card.hidden && !on) marker.addTo(map);
      });

      const key = shown.map((card) => card.dataset.store).join(",");
      if (shown.length && key !== lastFit) {
        lastFit = key;
        opened = null; // a different result set, so there is nothing to go back to
        fit();
      }
    }
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
    fill("[data-detail-name]", card.querySelector(".stores-card__name").textContent.trim());
    fill("[data-detail-address]", d.address);
    fill("[data-detail-type]", d.typeLabel);
    fill("[data-detail-status]", card.querySelector(".stores-card__status").textContent.trim());

    const hours = detail.querySelector("[data-detail-hours]");
    hours.textContent = "";
    [
      ["Mon - Fri", d.hoursWeekday],
      ["Saturday", d.hoursSat],
      ["Sunday", d.hoursSun]
    ].forEach(([day, value]) => {
      const dt = document.createElement("dt");
      dt.textContent = day;
      const dd = document.createElement("dd");
      dd.textContent = value;
      hours.append(dt, dd);
    });

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
    centreOn(card, 15);
    if (!desktop.matches) snapTo(1);
    detail.querySelector("[data-detail-name]").focus({ preventScroll: true });
  };

  const closeDetail = () => {
    detail.hidden = true;
    setActive(null); // back to the list is back to no selection, so the pin drops to its rest size
    // Nothing about the filters changed, so this is a mode switch and nothing
    // else. Running apply() here would re-fit the map and blink it for a click
    // that only asked to go back to the list.
    panel.dataset.mode = backMode;

    // Still re-centre the store just viewed, at the zoom already on screen:
    // going back changes which part of the map the panel leaves visible.
    if (opened) centreOn(opened, map ? map.getZoom() : 15);
  };

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
      if (map) map.invalidateSize({ animate: false });
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
      if (map) map.invalidateSize({ animate: false });
      return;
    }
    if (frame === null) {
      tick.last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };

  const snapTo = (i, velocity) => {
    snap = Math.min(snaps.length - 1, Math.max(0, i));
    springStart(snaps[snap], velocity || 0);
    grab.setAttribute("aria-expanded", String(snap === 0));
  };

  let dragFrom = null;
  let dragStart = 0;
  let dragged = false;
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

  const onMove = (e) => {
    if (dragFrom === null) return;
    dragged = true;
    const dt = e.timeStamp - lastT;
    if (dt > 0) velocity = (e.clientY - lastY) / dt;
    lastY = e.clientY;
    lastT = e.timeStamp;
    springAt = offsetFor(dragStart + (e.clientY - dragFrom));
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

  // Pulling the list down when it is already at the top drags the sheet instead
  // of doing nothing, which is the behaviour a sheet is expected to have.
  scroll?.addEventListener(
    "pointerdown",
    (e) => {
      if (desktop.matches || e.pointerType === "mouse" || scroll.scrollTop > 0) return;
      dragFrom = e.clientY;
      dragStart = springAt;
      lastY = e.clientY;
      lastT = e.timeStamp;
      velocity = 0;
    },
    { passive: true }
  );

  scroll?.addEventListener(
    "pointermove",
    (e) => {
      if (dragFrom === null) return;
      if (e.clientY - dragFrom > 4) {
        panel.setAttribute("data-dragging", "");
        onMove(e);
      }
    },
    { passive: true }
  );

  scroll?.addEventListener("pointerup", onUp, { passive: true });
  scroll?.addEventListener("pointercancel", onUp, { passive: true });

  grab.addEventListener("click", () => {
    // pointerup fires first, so a finished drag would otherwise toggle the snap
    // it just landed on.
    if (dragged) {
      dragged = false;
      return;
    }
    snapTo(snap === 0 ? 1 : 0);
  });
  grab.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      snapTo(snap - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      snapTo(snap + 1);
    }
  });

  const resize = () => {
    measure();
    if (!desktop.matches) {
      springAt = snaps[snap];
      springTo = springAt;
      setOffset(springAt);
    } else {
      panel.style.removeProperty("--sheet-y");
    }
    if (map) map.invalidateSize({ animate: false });
  };

  // See .stores-panel[data-settling] in stores.css: hover is suppressed for as
  // long as the reflow after a region opens takes to land. The flag goes up on
  // the summary's click, not on the <details> toggle event, because toggle is
  // queued and would land after the reflow it is meant to cover.
  let settling;
  const settle = () => {
    panel.dataset.settling = "";
    clearTimeout(settling);
    settling = setTimeout(() => delete panel.dataset.settling, 200);
  };

  regions.forEach((region) => {
    region.querySelector(".accordion__summary")?.addEventListener("click", settle);
    region.addEventListener("toggle", settle); // keyboard, and any programmatic open
  });

  // ── Wiring ────────────────────────────────────────────────────────────────
  cards.forEach((card) => card.addEventListener("click", () => openDetail(card)));
  back.addEventListener("click", closeDetail);

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
  measure();
  springAt = snaps[1];
  snapTo(1);
  apply();
})();
