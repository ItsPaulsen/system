// The basemap both map pages draw on: MapLibre rendering an OpenFreeMap style,
// bridged in as a Leaflet layer so markers, clustering and every gesture stay
// Leaflet's.
//
// The published style is retuned at load rather than forked: it stays whatever
// OpenFreeMap publishes, and we only say what differs. Two pages want the same
// map under different furniture, so the retuning lives here and the pages keep
// their own pins, panels and framing.
//
// basemap(map, el) attaches the layer and then watches for the two things the
// GL canvas can't notice on its own: a theme swap, which needs a new style, and
// a settled resize, which needs Leaflet's cached size thrown away. It returns a
// promise that settles once the tiles are actually drawn, for a caller that has
// something to hold back until there is a map to look at.
window.exampleBasemap = (function () {
  const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

  // Fetched once per page and kept. The style is a round-trip in front of every
  // tile request, so a map that is built later (the product page's picker only
  // exists once its dialog opens, and a closed dialog has no box to render into)
  // would otherwise wait for it before asking for a single tile. Warmed while
  // the page is idle instead, so opening the picker starts at the tiles.
  //
  // Patching mutates what it is handed, so each map gets its own copy.
  let styleDoc = null;
  const loadStyle = () => {
    styleDoc = styleDoc || fetch(STYLE_URL).then((r) => r.json());
    return styleDoc.then((doc) => structuredClone(doc));
  };

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => {
      // A failure here is not one worth reporting: applyStyle falls back to the
      // style as published, and this only ever meant to be early.
      loadStyle().catch(() => {});
    });
  }

  const GL_OPTIONS = { renderWorldCopies: false };

  const ATTRIBUTION =
    '&copy; <a href="https://openfreemap.org">OpenFreeMap</a> ' +
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  // One style, two passes. Liberty is the only OpenFreeMap style with the full
  // layer set: POIs, parks, landuse, buildings. The published dark style has 47
  // layers and no POIs at all, which is why a dark map built on it has no green
  // and no coloured markers however it is recoloured.
  //
  // Patched at load rather than forked, so the style stays whatever OpenFreeMap
  // publishes and we only say what differs. Raw colours throughout: these track
  // the basemap, not our palette.

  // Transit POIs go in both themes: bus stops and stations compete with the only
  // markers that matter here, ours. The rest stay, because they are most of the
  // map's colour.
  const dropped = (layer) => layer.id.endsWith("_casing") || layer.id === "poi_transit";

  // The rank-based POI layers carry stops and stations too, so dropping
  // poi_transit isn't enough: they have to be filtered by class as well.
  const TRANSIT = ["bus", "railway", "tram", "subway", "ferry_terminal", "airport", "aerialway"];

  const hideTransit = (style) => {
    style.layers.forEach((layer) => {
      if (!layer.id.startsWith("poi_")) return;
      const notTransit = ["!", ["in", ["get", "class"], ["literal", TRANSIT]]];
      layer.filter = layer.filter ? ["all", layer.filter, notTransit] : notTransit;
    });
  };

  // Names arrive later than published across the board. Streets come in with the
  // blocks rather than ahead of them (major 12.2, minor 15 published), and place
  // and water names thin out on the way out, where z8 suburbs and unthresholded
  // fjord names fill a regional view with hamlets.
  const LABEL_ZOOM = {
    "highway-name-major": 14,
    "highway-name-minor": 16,
    "highway-name-path": 17,
    label_other: 12,
    label_village: 11,
    label_town: 9,
    water_name_point_label: 11,
    water_name_line_label: 11
  };

  const patchLight = (style) => {
    style.layers = style.layers.filter((layer) => !dropped(layer));
    hideTransit(style);

    style.layers.forEach((layer) => {
      const paint = (values) => {
        layer.paint = { ...layer.paint, ...values };
      };

      if (layer.type === "background") {
        // A zoom ramp, not one colour. Up close the published cream is right:
        // parks read as green against a neutral city. Pulled out, most of the
        // country has no forest polygon at all, so the land carries the green.
        paint({
          "background-color": ["interpolate", ["linear"], ["zoom"], 7, "#dfeed4", 10, "#f8f4f0"]
        });
      } else if (layer.type === "line" && /^(road|tunnel|bridge)_/.test(layer.id)) {
        if (/rail|path|pedestrian|pattern/.test(layer.id)) return;
        const major = /motorway|trunk|primary/.test(layer.id);
        paint({ "line-color": major ? "#b3bacb" : "#ccd2de" });
      } else if (layer.id === "water") {
        paint({ "fill-color": "#8ec8f2" });
      } else if (layer.id === "building") {
        // Buildings arrive two zoom levels later than published (13/14), so the
        // street grid fills in first and the blocks follow once you are close
        // enough for them to mean something. Flat for one level, then extruded.
        layer.minzoom = 15;
        layer.maxzoom = 16;
        delete layer.paint?.["fill-outline-color"];
        paint({ "fill-color": "#ede4d8" });
      } else if (layer.id === "building-3d") {
        layer.minzoom = 16;
        paint({ "fill-extrusion-color": "#ece2d4", "fill-extrusion-opacity": 0.55 });
      } else if (layer.id === "park") {
        delete layer.paint?.["fill-outline-color"];
        paint({ "fill-color": "#b7e29c", "fill-opacity": 1 });
      } else if (layer.id === "landcover_grass") {
        paint({ "fill-color": "#b7e29c", "fill-opacity": 0.75 });
      } else if (layer.id === "landcover_wood") {
        paint({ "fill-color": "#b7e29c", "fill-opacity": 0.6 });
      }

      if (LABEL_ZOOM[layer.id]) layer.minzoom = LABEL_ZOOM[layer.id];
    });
  };

  // Dark is the light map inverted, not a second set of colours picked by hand.
  // Hand-picking is what kept going wrong: every value chosen on its own, so the
  // relationships between land, water, parks and roads never survived the trip.
  // Here the light style is built first and then every colour in it is flipped
  // in lightness with its hue kept, which carries those relationships across by
  // construction. POI icons are sprites and keep their own colours.
  const probe = document.createElement("span");

  const rgba = (value) => {
    probe.style.color = "";
    probe.style.color = value; // invalid values leave it empty, which is the test
    const parts = probe.style.color.match(/rgba?\(([^)]+)\)/);
    if (!parts) return null;
    const [r, g, b, a = 1] = parts[1].split(",").map(Number);
    return { r, g, b, a };
  };

  const flip = (value, range, chroma, cool) => {
    const c = rgba(value);
    if (!c) return value;
    const [r, g, b] = [c.r / 255, c.g / 255, c.b / 255];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;

    let h = 0;
    if (d) {
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }

    // Floors and ceilings. The floor is well off black: a cream ground inverts
    // to almost nothing, and a map whose land is pure black leaves everything
    // drawn on it shouting. Saturation
    // comes down hard: the same chroma reads far louder against a dark ground
    // than against cream, so a park that was a quiet pastel comes back vivid.
    //
    // `range` compresses the flip. Lines and labels take the full swing, which
    // is what keeps roads and names bright. Area fills take less than half of
    // it: a forest slightly darker than cream is quiet, but the same gap the
    // other way turns every wooded hill into the loudest thing on the map.
    const lightness = Math.min(0.88, Math.max(0.17, 0.17 + (1 - l) * range));

    // Saturation comes from chroma, not from HSL's S. A near-white cream reports
    // ~37% S purely because it is light; carry that number down to a dark
    // lightness and the neutral ground comes back brown. Chroma is what the
    // colour actually holds, so a near-neutral stays near-neutral and a real
    // green keeps being green. Damped, since the same chroma reads louder on a
    // dark ground than on cream.
    const span = 1 - Math.abs(2 * lightness - 1);
    let sat = span > 0 ? Math.min(1, (d / span) * chroma) : 0;
    let hue = h;

    // Warm area fills go cool. A cream ground, a beige residential block, a
    // yellow school yard: warm because they sit on paper, and on the dark side
    // they come back as brown. Only green and blue carry meaning here, so those
    // hues are kept and everything else lands in the same blue-grey as the roads
    // and the water.
    const meaningful = h >= 70 && h <= 260; // greens through blues
    if (cool && !meaningful) {
      hue = 220;
      sat = Math.max(sat, 0.16);
    }

    return `hsla(${Math.round(hue)},${Math.round(sat * 100)}%,${Math.round(lightness * 100)}%,${c.a})`;
  };

  const flipDeep = (value, range, chroma, cool) => {
    if (Array.isArray(value)) return value.map((item) => flipDeep(item, range, chroma, cool));
    return typeof value === "string" ? flip(value, range, chroma, cool) : value;
  };

  const patchDark = (style) => {
    patchLight(style);

    style.layers.forEach((layer) => {
      if (!layer.paint) return;
      // Shields keep their published colours: the plate behind them is a pale
      // sprite we can't recolour, so inverting the text puts light on light.
      if (/shield/.test(layer.id)) return;

      // Area fills sit close to the land and hold little colour: a forest is a
      // huge polygon, and at a light map's contrast it becomes the whole picture
      // once the ground is dark. Lines and labels take the full swing, which is
      // what keeps roads and names bright.
      const area = /^(background|fill|fill-extrusion)$/.test(layer.type);
      const range = area ? 0.28 : 1;
      const chroma = area ? 0.3 : 0.55;

      Object.keys(layer.paint).forEach((key) => {
        if (key.endsWith("color"))
          layer.paint[key] = flipDeep(layer.paint[key], range, chroma, area);
      });

      // Hatching and the pier/rail patterns are sprites, so the flip above can't
      // reach them: they stay the pale fill drawn for a cream page, which on a
      // dark ground is the loudest thing on the map. Their light versions are
      // barely there, so this is what "the same, in dark" means for them.
      const patterned = Object.keys(layer.paint).some((key) => key.endsWith("-pattern"));
      if (patterned || /hatching/.test(layer.id)) {
        layer.paint[layer.type === "line" ? "line-opacity" : "fill-opacity"] = 0.12;
      }

      // The one value not derived: flipping the light blue lands on a slate the
      // fjord reads too pale in. Water goes darker than the land at night, which
      // is the opposite of the flip's direction for it.
      if (layer.id === "water") layer.paint["fill-color"] = "#0f1626";
      if (layer.id === "waterway") layer.paint["line-color"] = "#0f1626";
    });
  };

  // Per map, since the layer and the theme it was last built for belong to the
  // instance, while everything above is one set of rules.
  const attach = (map, el) => {
    let tiles = null;
    let theme = "";

    const applyStyle = (next) =>
      loadStyle()
        .then((style) => {
          if (next === "dark") patchDark(style);
          else patchLight(style);

          if (tiles) tiles.getMaplibreMap()?.setStyle(style);
          else
            tiles = window.L.maplibreGL({ style, attribution: ATTRIBUTION, ...GL_OPTIONS }).addTo(
              map
            );
        })
        .catch(() => {
          // Couldn't read the style: fall back to it as published rather than to
          // no basemap at all.
          if (!tiles)
            tiles = window.L.maplibreGL({
              style: STYLE_URL,
              attribution: ATTRIBUTION,
              ...GL_OPTIONS
            }).addTo(map);
        });

    theme = document.documentElement.dataset.theme;

    // Drawn, not merely fetched. `load` is the first visually complete render:
    // the style is down and the view is covered, with whatever is still coming
    // filling in afterwards. Not `idle`, which additionally waits for every tile
    // and transition to settle and holds the frame back well past the point
    // there is a map in it. A map that never gets there (offline, a blocked CDN)
    // leaves this pending, so a caller waiting on it keeps what it was showing.
    const ready = applyStyle(theme).then(
      () =>
        new Promise((resolve) => {
          const gl = tiles?.getMaplibreMap?.();
          if (!gl) return;
          if (gl.loaded()) resolve();
          else gl.once("load", resolve);
        })
    );

    // Leaflet caches the container's size at init, and at that point the page is
    // still settling (web font, sticky topbar, a sheet's own measure pass). A
    // stale size leaves its controls positioned against a box taller than the one
    // now drawn, so the attribution ends up clipped off the bottom edge. Watching
    // the element covers every cause of a resize, including the ones no window
    // event fires for.
    let sizing;
    new ResizeObserver(() => {
      // Trailing, not throttled: the GL canvas stretches to fill on its own
      // while the drag is in flight, and one invalidateSize at the end is what
      // actually needs to happen.
      clearTimeout(sizing);
      sizing = setTimeout(() => map.invalidateSize({ animate: false }), 200);
    }).observe(el);

    // Dark theme is a token swap everywhere else on the site; the basemap is the
    // one thing that needs telling, so it follows data-theme the same way.
    new MutationObserver(() => {
      const next = document.documentElement.dataset.theme;
      if (tiles && next !== theme) {
        theme = next;
        applyStyle(next);
      }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // Keyboard on the pins. Leaflet focuses a marker but only answers Enter, and
    // only through the deprecated keypress event, which never carries Space at
    // all: a focused pin is reachable and then does nothing on the key half the
    // web treats as "press this". Both keys go through the element's own click
    // here, so whatever the page bound to a pin click is the one path, and
    // cancelling the keydown suppresses the keypress Leaflet would have answered
    // as well as the page scroll Space would have caused.
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const icon = e.target.closest?.(".leaflet-marker-icon");
      if (!icon) return;
      e.preventDefault();
      icon.click();
    });

    return ready;
  };

  return attach;
})();
