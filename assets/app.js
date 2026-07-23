// Shared page script for every project page:
//   • injects the site nav (brand + theme toggle)
//   • click-to-copy + toast
//   • hydrates palette chips / token chips / type rows from :root (the single source of truth)
//   • tracks the active breakpoint on resize
// Tokens are declared with data-token (the CSS custom-property name, sans "--").

const toast = (() => {
  let el;
  let timer;
  return (message) => {
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove("is-visible"), 1400);
  };
})();

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    toast(label);
  } catch {
    toast("Copy failed");
  }
}

// Extract only the CSS custom-property declarations whose names start with any
// of the given prefixes, from every :root (or :root[data-theme="…"]) rule.
// Comma-separated prefixes: "shadow,radius" keeps --shadow-* and --radius-*.
function filterTokens(cssText, prefixList) {
  const prefixes = prefixList
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const isMatch = (name) => prefixes.some((p) => name === `--${p}` || name.startsWith(`--${p}-`));
  const rulePattern = /(:root(?:\[data-theme="(?:dark|light)"\])?)\s*\{([\s\S]*?)\}/g;
  const declPattern = /(--[a-z0-9-]+)\s*:\s*([^;]+);/g;
  const blocks = [];
  let m;
  while ((m = rulePattern.exec(cssText))) {
    const selector = m[1];
    const body = m[2];
    const kept = [];
    let d;
    while ((d = declPattern.exec(body))) {
      if (isMatch(d[1])) kept.push(`  ${d[1]}: ${d[2].trim()};`);
    }
    if (kept.length) blocks.push(`${selector} {\n${kept.join("\n")}\n}`);
  }
  return blocks.join("\n\n");
}

/* ── Theme ─────────────────────────────────────────────────────────────── */

function currentTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function setTheme(theme) {
  // Suppress transitions across the swap — otherwise every element with a
  // colour transition (buttons, pagination, cards) animates its background
  // change and reads as a flash.
  const root = document.documentElement;
  root.classList.add("no-transitions");
  root.dataset.theme = theme;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove("no-transitions"));
  });
  try {
    localStorage.setItem("theme", theme);
  } catch {
    /* storage may be unavailable; theme still applies for this page */
  }
  const btn = document.querySelector(".theme-toggle");
  if (btn) btn.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
}

function injectSkipLink() {
  if (document.querySelector(".skip-link")) return;
  const wrap = document.querySelector(".wrap");
  if (!wrap) return;
  if (!wrap.id) wrap.id = "main";
  wrap.setAttribute("tabindex", "-1");
  const a = document.createElement("a");
  a.className = "skip-link";
  a.href = `#${wrap.id}`;
  a.textContent = "Skip to content";
  document.body.prepend(a);
}

function injectNav() {
  if (document.querySelector(".site-nav")) return;
  const nav = document.createElement("header");
  nav.className = "site-nav";
  // Icons are Lucide (lucide.dev, ISC) — inlined so the shell stays dependency-free.
  const lucide = {
    menu: '<line class="ham-line ham-line--top" x1="4" x2="20" y1="9" y2="9"/><line class="ham-line ham-line--bot" x1="4" x2="20" y1="15" y2="15"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    "arrow-left": '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>'
  };
  const icon = (name, size = 18, cls = "") =>
    `<svg class="icon${cls ? ` ${cls}` : ""}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${lucide[name]}</svg>`;

  // Detect the project from the URL: /demo/... → "Demo". At the site root the
  // title falls back to "system" so the nav still has a label.
  const projectMatch = location.pathname.match(/^\/([^/]+)\//);
  const projectSlug = projectMatch ? projectMatch[1] : null;
  const projectName = projectSlug ? projectSlug[0].toUpperCase() + projectSlug.slice(1) : "system";
  const projectHref = projectSlug ? `/${projectSlug}/` : "/";

  nav.innerHTML = `
    <div class="site-nav__inner">
      <div class="site-nav__left">
        <button class="site-nav__menu" type="button" aria-label="Toggle menu" aria-expanded="false">
          ${icon("menu", 24)}
        </button>
        <a class="site-nav__brand" href="${projectHref}">${projectName}</a>
      </div>
      <button class="theme-toggle" type="button" aria-label="Switch theme">
        ${icon("sun", 18, "icon-sun")}${icon("moon", 18, "icon-moon")}
      </button>
    </div>`;
  document.body.prepend(nav);
  setTheme(currentTheme());
}

// The demo project's page nav. Each entry is a page; the current one is highlighted.
// (One topic per page reads cleaner than one giant scrolling doc.)
const DEMO_PAGES = [
  {
    group: "Content",
    links: [
      { label: "Introduction", href: "/demo/" },
      { label: "Colors", href: "/demo/colors/" },
      { label: "Typography", href: "/demo/typography/" },
      { label: "Grid", href: "/demo/grid/" },
      { label: "Spacing", href: "/demo/spacing/" },
      { label: "Radii", href: "/demo/radii/" },
      { label: "Shadows", href: "/demo/shadows/" },
      { label: "Motion", href: "/demo/motion/" }
    ]
  }
];

// Lucide arrow-left inlined at 16px for the sidebar's back link.
const ARROW_LEFT_16 =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>';

function isCurrentPage(href) {
  const here = location.pathname.replace(/\/index\.html$/, "/");
  const there = href.replace(/\/index\.html$/, "/");
  return here === there;
}

// Build the sidebar from DEMO_PAGES. Wrap the content in a shell so the sidebar
// can sit beside it as a sticky left column (shadcn-style layout).
function injectSidebar() {
  if (document.querySelector(".sidebar")) return;
  const wrap = document.querySelector(".wrap");
  let region;
  if (wrap && !wrap.closest(".content-region")) {
    const shell = document.createElement("div");
    shell.className = "shell";
    region = document.createElement("div");
    region.className = "content-region";
    wrap.parentNode.insertBefore(shell, wrap);
    region.appendChild(wrap);
    shell.appendChild(region);
  }

  const aside = document.createElement("aside");
  aside.className = "sidebar";
  // Inner spans give us shadcn-style pill hover: the anchor stays full width
  // for a wide click target, but the visual bg wraps only the label.
  const backLink = `<a class="sidebar__back" href="/"><span>${ARROW_LEFT_16}All projects</span></a>`;
  aside.innerHTML =
    backLink +
    DEMO_PAGES.map(
      (g) => `
      <div class="sidebar__group">
        <p class="sidebar__group-title">${g.group}</p>
        ${g.links
          .map(
            (l) =>
              `<a class="sidebar__link${isCurrentPage(l.href) ? " is-active" : ""}" href="${l.href}"><span>${l.label}</span></a>`
          )
          .join("")}
      </div>`
    ).join("");

  const backdrop = document.createElement("div");
  backdrop.className = "sidebar-backdrop";

  const shell = region ? region.closest(".shell") : null;
  if (shell) shell.insertBefore(aside, region);
  else document.body.append(aside);
  document.body.append(backdrop);
  wireSidebar(aside, backdrop);
}

function wireSidebar(aside, backdrop) {
  const menuBtn = document.querySelector(".site-nav__menu");
  // Enable animation transiently for the duration of an actual open/close.
  // If .is-anim persisted, a later resize across the mobile breakpoint would
  // animate the drawer's default → hidden state and cause a fade on resize.
  let animTimer;
  const animate = () => {
    aside.classList.add("is-anim");
    clearTimeout(animTimer);
    animTimer = setTimeout(() => aside.classList.remove("is-anim"), 250);
  };
  const close = () => {
    animate();
    aside.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
  };
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      animate();
      const open = !aside.classList.contains("is-open");
      aside.classList.toggle("is-open", open);
      backdrop.classList.toggle("is-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
    });
  }
  backdrop.addEventListener("click", close);
  aside.addEventListener("click", (e) => {
    if (e.target.closest(".sidebar__link")) close();
  });
}

/* ── Token hydration ───────────────────────────────────────────────────── */

// Colors page: family definitions rendered into palette tables at init.
// Keeping this as data (not HTML) means adding/removing a token is one line.
// States: 3-column families expand to base + `-hover` + `-active` per row;
// single-column families (Fill) render one swatch per base token.
const PALETTE_FAMILIES = [
  {
    title: "Neutral",
    note: "Borders, dividers, and quiet surfaces.",
    tokens: [
      "neutral-gray-1",
      "neutral-gray-2",
      "neutral-gray-3",
      "neutral-gray-4",
      "neutral-white",
      "neutral-black"
    ]
  },
  {
    title: "Background",
    note: "Page and card surfaces.",
    tokens: ["background-primary", "background-secondary"]
  },
  {
    title: "Ink",
    note: "Text and icon tones.",
    tokens: ["ink-primary", "ink-secondary", "ink-tertiary"]
  },
  { title: "Primary", tokens: ["primary"] },
  {
    title: "Feedback",
    note: "Status, validation, and system messages.",
    tokens: ["success", "warning", "danger"]
  },
  { title: "Focus", note: "Keyboard focus ring.", tokens: ["focus"] },
  { title: "Overlay", note: "Modal and drawer backdrops.", tokens: ["overlay"] },
  {
    title: "Fill",
    note: "Alpha tints — layer over any surface for hover overlays or selected rows.",
    tokens: ["fill-primary", "fill-secondary", "fill-tertiary", "fill-quaternary"],
    single: true
  }
];

const PALETTE_STATES = ["default", "hover", "active"];

function renderPaletteFamily(family) {
  const states = family.single ? ["default"] : PALETTE_STATES;
  const headerCells = family.single
    ? `<th class="palette-table__state"></th>`
    : states
        .map((s) => `<th class="palette-table__state">${s[0].toUpperCase() + s.slice(1)}</th>`)
        .join("");
  const rows = family.tokens
    .map((base) => {
      const cells = states
        .map((s) => {
          const token = s === "default" ? base : `${base}-${s}`;
          const swatchClass = family.single
            ? "palette-swatch palette-swatch--wide"
            : "palette-swatch";
          return `<td class="palette-table__state"><button type="button" class="${swatchClass}" data-token="${token}" aria-label="Copy ${token}"></button></td>`;
        })
        .join("");
      return `<tr><th scope="row"><code>${base}</code></th>${cells}</tr>`;
    })
    .join("");
  const note = family.note ? `<p class="section-note">${family.note}</p>` : "";
  return `
    <section class="preview-block">
      <h3 class="subhead">${family.title}</h3>
      ${note}
      <article class="palette-table">
        <div class="palette-table__scroll">
          <table>
            <thead>
              <tr><th class="palette-table__token">Token</th>${headerCells}</tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderPalette() {
  const host = document.querySelector("[data-palette-host]");
  if (!host) return;
  host.innerHTML = PALETTE_FAMILIES.map(renderPaletteFamily).join("");
}

// Fill each swatch's colour + copy target from its :root token.
function hydratePalette() {
  const rootStyle = getComputedStyle(document.documentElement);
  document.querySelectorAll(".palette-swatch").forEach((el) => {
    const { token } = el.dataset;
    if (!token) return;
    const value = rootStyle.getPropertyValue(`--${token}`).trim();
    if (!value) return;
    el.style.setProperty("--c", value);
    el.dataset.copy = value;
  });
}

// Generic: fill a copyable preview element from its :root token, then optionally style a preview.
function hydratePreview(selector, valueSelector, apply) {
  const rootStyle = getComputedStyle(document.documentElement);
  document.querySelectorAll(selector).forEach((el) => {
    const { token } = el.dataset;
    if (!token) return;
    const value = rootStyle.getPropertyValue(`--${token}`).trim();
    if (!value) return;
    const valueEl = el.querySelector(valueSelector);
    if (valueEl) valueEl.textContent = value;
    el.dataset.copy = value;
    if (apply) apply(el, value);
  });
}

function setSpec(row, name, text) {
  const el = row.querySelector(`[data-spec="${name}"]`);
  if (el) el.textContent = text;
}

// Read each type role's metrics. Size comes from computed style (px); line-height
// from the raw token so unitless multipliers show as "1.5" not "24px".
function hydrateType() {
  const rootStyle = getComputedStyle(document.documentElement);
  document.querySelectorAll(".type-row").forEach((row) => {
    const sample = row.querySelector(".type-row__sample");
    if (!sample) return;
    const cs = getComputedStyle(sample);
    const sizePx = Math.round(parseFloat(cs.fontSize));
    const { token } = row.dataset;
    const lhRaw = token ? rootStyle.getPropertyValue(`--${token}-lh`).trim() : "";
    const lh = lhRaw || Math.round(parseFloat(cs.lineHeight));
    // CSS-shorthand-style: size / line-height / weight.
    setSpec(row, "size", `${sizePx}/${lh}/${cs.fontWeight}`);
    setSpec(row, "lh", "");
    setSpec(row, "weight", "");

    if (token) {
      row.dataset.copy = rootStyle.getPropertyValue(`--${token}-size`).trim();
    }
  });
}

// Show the active viewport width and matching tier (read thresholds from tokens).
function updateBreakpoint() {
  const el = document.querySelector("[data-bp-indicator]");
  if (!el) return;
  const rootStyle = getComputedStyle(document.documentElement);
  const width = window.innerWidth;
  const tablet = parseFloat(rootStyle.getPropertyValue("--bp-tablet"));
  const desktop = parseFloat(rootStyle.getPropertyValue("--bp-desktop"));
  let tier = "mobile";
  if (width >= desktop) tier = "desktop";
  else if (width >= tablet) tier = "tablet";
  el.textContent = `${width}px · ${tier}`;
}

// Rebuild the grid overlay's columns to match --grid-columns at the current breakpoint,
// and label the outer margin bands with the current --grid-margin.
function buildGridOverlay() {
  const cols = document.querySelector("[data-grid-cols]");
  if (!cols) return;
  const rootStyle = getComputedStyle(document.documentElement);

  const count = parseInt(rootStyle.getPropertyValue("--grid-columns"), 10);
  if (count && cols.children.length !== count) {
    cols.replaceChildren();
    for (let i = 0; i < count; i += 1) {
      const col = document.createElement("span");
      col.className = "grid-overlay__col";
      cols.appendChild(col);
    }
  }

  const margin = rootStyle.getPropertyValue("--grid-margin").trim();
  document.querySelectorAll("[data-grid-margin-label]").forEach((el) => {
    el.textContent = margin;
  });
}

function refreshResponsive() {
  hydrateType();
  // Grid page tokens (--grid-columns etc.) change with viewport, so re-hydrate.
  hydratePreviews();
  buildGridOverlay();
  updateBreakpoint();
}

/* ── Init ──────────────────────────────────────────────────────────────── */

// Token-driven demos — space bars, radius/shadow chips. Grouped so a theme
// switch or viewport change can re-run them (shadow values are theme-dependent).
function hydratePreviews() {
  hydratePreview(".token-list__row", ".token-list__value", (el, value) => {
    const bar = el.querySelector("[data-space-bar]");
    if (bar) bar.style.width = value;
    delete el.dataset.copy;
  });
  hydratePreview(".preview-card", ".preview-card__value", (el, value) => {
    const shadow = el.querySelector("[data-shadow-demo]");
    if (shadow) shadow.style.boxShadow = value;
    const radius = el.querySelector("[data-radius-demo]");
    if (radius) radius.style.borderRadius = value;
    delete el.dataset.copy;
  });
}

// Grid breakpoint tabs — swap the values shown without needing a viewport
// resize. Values mirror the media queries in demo/tokens.css.
const GRID_BREAKPOINTS = {
  mobile: {
    name: "Mobile",
    threshold: "< 640px",
    "grid-columns": "4",
    "grid-gutter": "16px",
    "grid-margin": "16px",
    "container-max": "1200px"
  },
  tablet: {
    name: "<code>bp-tablet</code>",
    threshold: "640px",
    "grid-columns": "12",
    "grid-gutter": "20px",
    "grid-margin": "24px",
    "container-max": "1200px"
  },
  desktop: {
    name: "<code>bp-desktop</code>",
    threshold: "1024px",
    "grid-columns": "12",
    "grid-gutter": "20px",
    "grid-margin": "32px",
    "container-max": "1200px"
  }
};

function initGridTabs() {
  const tabList = document.querySelector("[data-grid-tabs]");
  const panel = document.querySelector("[data-grid-panel]");
  if (!tabList || !panel) return;
  const tabs = tabList.querySelectorAll(".tabs__tab");
  const setActive = (name) => {
    const values = GRID_BREAKPOINTS[name];
    if (!values) return;
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
    panel.querySelectorAll("[data-grid-key]").forEach((el) => {
      const v = values[el.dataset.gridKey] || "";
      if (el.dataset.gridKey === "name") el.innerHTML = v;
      else el.textContent = v;
    });
  };
  tabs.forEach((t) => t.addEventListener("click", () => setActive(t.dataset.tab)));
  // Default to the first tab so entering the page always starts here.
  const first = tabs[0]?.dataset.tab;
  if (first) setActive(first);
}

// Lucide arrow-right at 16px (arrow-left is mirrored via CSS transform).
const ARROW_RIGHT_16 =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

// Inject a shadcn-style prev/next pair at the bottom of each doc page.
function injectPagination() {
  const wrap = document.querySelector(".wrap");
  if (!wrap || document.querySelector(".pagination")) return;
  const flat = DEMO_PAGES.flatMap((g) => g.links);
  const idx = flat.findIndex((l) => isCurrentPage(l.href));
  if (idx < 0) return;
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx < flat.length - 1 ? flat[idx + 1] : null;
  if (!prev && !next) return;
  const nav = document.createElement("nav");
  nav.className = "pagination";
  nav.setAttribute("aria-label", "Docs pagination");
  const parts = [];
  if (prev) {
    parts.push(
      `<a class="pagination__link pagination__link--prev" href="${prev.href}">${ARROW_LEFT_16}<span>${prev.label}</span></a>`
    );
  }
  if (next) {
    parts.push(
      `<a class="pagination__link pagination__link--next" href="${next.href}"><span>${next.label}</span>${ARROW_RIGHT_16}</a>`
    );
  }
  nav.innerHTML = parts.join("");
  wrap.appendChild(nav);
}

function init() {
  injectSkipLink();
  injectNav();
  injectSidebar();
  injectPagination();
  renderPalette();
  hydratePalette();
  hydratePreviews();
  initGridTabs();
  refreshResponsive();

  let frame;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(refreshResponsive);
  });

  document.addEventListener("click", (event) => {
    const themeBtn = event.target.closest(".theme-toggle");
    if (themeBtn) {
      setTheme(currentTheme() === "dark" ? "light" : "dark");
      // Re-read all token-driven previews so their swatches, values, and copy
      // targets match the new theme.
      refreshResponsive();
      hydratePalette();
      hydratePreviews();
      return;
    }
    const gridBtn = event.target.closest("[data-grid-toggle]");
    if (gridBtn) {
      const overlay = document.querySelector("[data-grid-overlay]");
      if (!overlay) return;
      const show = overlay.hidden;
      overlay.hidden = !show;
      gridBtn.setAttribute("aria-checked", String(show));
      return;
    }
    const cssBtn = event.target.closest("[data-copy-css]");
    if (cssBtn) {
      const src = cssBtn.dataset.copyCss;
      const filter = cssBtn.dataset.copyTokens; // optional: comma-list of prefixes
      const label = filter ? "Copied tokens" : "Copied all tokens";
      fetch(src)
        .then((r) => r.text())
        .then((text) => copyText(filter ? filterTokens(text, filter) : text.trim(), label))
        .catch(() => toast("Copy failed"));
      return;
    }
    const target = event.target.closest("[data-copy]");
    if (target) copyText(target.dataset.copy, `Copied ${target.dataset.copy}`);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
