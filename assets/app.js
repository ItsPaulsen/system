// Shared page script for every project page:
//   • injects the site nav (brand + theme toggle)
//   • click-to-copy + toast
//   • hydrates palette chips / token chips / type rows from :root (the single source of truth)
//   • tracks the active breakpoint on resize
// Tokens are declared with data-token (the CSS custom-property name, sans "--").

// toast(msg) / toast.success|info|warning|error(msg) / toast.promise(p, msgs).
// One reused pill; typed toasts get a Tabler icon in the matching semantic
// colour (same icons as the Alert component).
const toast = (() => {
  const ICONS = {
    success: '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M9 12l2 2l4 -4" />',
    info: '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 8h.01" /><path d="M11 12h1v4h1" />',
    warning:
      '<path d="M12 9v4" /><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z" /><path d="M12 16h.01" />',
    error:
      '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 8v4" /><path d="M12 16h.01" />'
  };
  const svg = (type) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[type]}</svg>`;

  let el;
  let iconEl;
  let textEl;
  let timer;
  // Mount the live region up front (idempotent) so its first announcement isn't
  // injected and populated in the same tick — some screen readers miss that.
  const ensure = () => {
    if (el) return;
    el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    iconEl = document.createElement("span");
    iconEl.className = "toast__icon";
    textEl = document.createElement("span");
    textEl.className = "toast__text";
    el.append(iconEl, textEl);
    document.body.appendChild(el);
  };
  const render = (message, type = "default") => {
    ensure();
    // error/warning are interruptive — assertive/alert so they aren't queued
    // behind whatever a polite region is already reading.
    const assertive = type === "error" || type === "warning";
    el.setAttribute("role", assertive ? "alert" : "status");
    el.setAttribute("aria-live", assertive ? "assertive" : "polite");
    el.dataset.type = type;
    // Loading uses the ring spinner (matches the Spinner component); the other
    // types use their semantic Tabler glyph.
    let iconMarkup = "";
    if (type === "loading") iconMarkup = '<span class="toast__spinner"></span>';
    else if (ICONS[type]) iconMarkup = svg(type);
    iconEl.innerHTML = iconMarkup;
    textEl.textContent = message;
    el.classList.add("is-visible");
  };

  const show = (message, opts = {}) => {
    render(message, opts.type);
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove("is-visible"), opts.duration || 4000);
  };
  show.success = (m) => show(m, { type: "success" });
  show.info = (m) => show(m, { type: "info" });
  show.warning = (m) => show(m, { type: "warning" });
  show.error = (m) => show(m, { type: "error" });
  // Loading toast that resolves into success/error; stays until the promise settles.
  show.promise = (p, msgs = {}) => {
    render(msgs.loading || "Loading…", "loading");
    clearTimeout(timer);
    // Attaching a rejection handler here also marks `p` as handled, so
    // returning the original promise (callers await its real resolved value)
    // can't raise an unhandled rejection when the caller ignores it.
    Promise.resolve(p).then(
      () => show(msgs.success || "Done", { type: "success" }),
      () => show(msgs.error || "Something went wrong", { type: "error" })
    );
    return p;
  };
  show.mount = ensure;
  return show;
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
  const isRoot = location.pathname === "/" || location.pathname === "/index.html";
  // Root landing: no project to label and nothing to scroll under, so the nav
  // drops its brand and its surface — just the theme toggle floating on the page.
  if (isRoot) nav.classList.add("site-nav--bare");
  // Icons are Tabler (tabler.io, MIT) — inlined so the shell stays
  // dependency-free. `menu` is a custom two-line mark that morphs into a close
  // (X) via CSS; the rest are Tabler paths. The hamburger keeps its own
  // stroke-width in CSS (.ham-line) so the shared stroke-width below is free to
  // match Tabler's default of 2.
  const tabler = {
    menu: '<line class="ham-line ham-line--top" x1="4" x2="20" y1="9" y2="9"/><line class="ham-line ham-line--bot" x1="4" x2="20" y1="15" y2="15"/>',
    sun: '<path d="M14.828 14.828a4 4 0 1 0 -5.656 -5.656a4 4 0 0 0 5.656 5.656z"/><path d="M6.343 17.657l-1.414 1.414"/><path d="M6.343 6.343l-1.414 -1.414"/><path d="M17.657 6.343l1.414 -1.414"/><path d="M17.657 17.657l1.414 1.414"/><path d="M4 12l-2 0"/><path d="M12 4l0 -2"/><path d="M20 12l2 0"/><path d="M12 20l0 2"/>',
    moon: '<path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/>',
    "arrow-left": '<path d="M5 12l14 0"/><path d="M5 12l6 6"/><path d="M5 12l6 -6"/>'
  };
  const icon = (name, size = 18, cls = "") =>
    `<svg class="icon${cls ? ` ${cls}` : ""}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${tabler[name]}</svg>`;

  // Detect the project from the URL: /demo/... → "Demo". At the site root the
  // title falls back to "system" so the nav still has a label.
  const projectMatch = location.pathname.match(/^\/([^/]+)\//);
  const projectSlug = projectMatch ? projectMatch[1] : null;
  const projectName = projectSlug ? projectSlug[0].toUpperCase() + projectSlug.slice(1) : "system";
  const projectHref = projectSlug ? `/${projectSlug}/` : "/";

  // The menu button only toggles the per-project sidebar, so show it only where
  // a sidebar exists — not the root landing, not an unknown project.
  const menuBtn = currentProjectPages()
    ? `<button class="site-nav__menu" type="button" aria-label="Toggle menu" aria-expanded="false">${icon("menu", 24)}</button>`
    : "";

  nav.innerHTML = `
    <div class="site-nav__inner">
      <div class="site-nav__left">
        ${menuBtn}
        ${isRoot ? "" : `<a class="site-nav__brand" href="${projectHref}"></a>`}
      </div>
      <button class="theme-toggle" type="button" aria-label="Switch theme">
        ${icon("sun", 18, "icon-sun")}${icon("moon", 18, "icon-moon")}
      </button>
    </div>`;
  document.body.prepend(nav);
  // Set the brand label as text (not interpolated into innerHTML) since it's
  // derived from the URL path.
  const brand = nav.querySelector(".site-nav__brand");
  if (brand) brand.textContent = projectName;
  setTheme(currentTheme());
}

// Per-project sidebar nav, keyed by the URL's first path segment (/demo/… →
// "demo"). Each entry is one page; the current one is highlighted, and one
// topic per page reads cleaner than one giant scrolling doc. Add a project by
// dropping a new key here — the sidebar, back link, and pagination all follow.
const PROJECT_PAGES = {
  demo: [
    {
      group: "Foundation",
      links: [
        { label: "Introduction", href: "/demo/" },
        { label: "Colors", href: "/demo/colors/" },
        { label: "Typography", href: "/demo/typography/" },
        { label: "Layout", href: "/demo/layout/" },
        { label: "Radii", href: "/demo/radii/" },
        { label: "Shadows", href: "/demo/shadows/" },
        { label: "Motion", href: "/demo/motion/" }
      ]
    },
    {
      group: "Components",
      links: [
        { label: "Accordion", href: "/demo/components/accordion/" },
        { label: "Alert", href: "/demo/components/alert/" },
        { label: "Avatar", href: "/demo/components/avatar/" },
        { label: "Badge", href: "/demo/components/badge/" },
        { label: "Breadcrumb", href: "/demo/components/breadcrumb/" },
        { label: "Button", href: "/demo/components/button/" },
        { label: "Card", href: "/demo/components/card/" },
        { label: "Checkbox", href: "/demo/components/checkbox/" },
        { label: "Dialog", href: "/demo/components/dialog/" },
        { label: "Dropdown Menu", href: "/demo/components/dropdown/" },
        { label: "Filter Chips", href: "/demo/components/chip/" },
        { label: "Input", href: "/demo/components/input/" },
        { label: "Link", href: "/demo/components/link/" },
        { label: "Native Select", href: "/demo/components/native-select/" },
        { label: "Navigation Menu", href: "/demo/components/navigation-menu/", new: true },
        { label: "Pagination", href: "/demo/components/pagination/" },
        { label: "Popover", href: "/demo/components/popover/" },
        { label: "Progress", href: "/demo/components/progress/" },
        { label: "Radio Group", href: "/demo/components/radio/" },
        { label: "Select", href: "/demo/components/select/" },
        { label: "Sheet", href: "/demo/components/sheet/" },
        { label: "Skeleton", href: "/demo/components/skeleton/" },
        { label: "Slider", href: "/demo/components/slider/" },
        { label: "Spinner", href: "/demo/components/spinner/" },
        { label: "Switch", href: "/demo/components/switch/" },
        { label: "Table", href: "/demo/components/table/" },
        { label: "Tabs", href: "/demo/components/tabs/" },
        { label: "Textarea", href: "/demo/components/textarea/" },
        { label: "Toast", href: "/demo/components/toast/" },
        { label: "Tooltip", href: "/demo/components/tooltip/" }
      ]
    }
  ]
};

// The page groups for the project in the current URL, or null at the site root
// / on any path without a matching project entry.
function currentProjectPages() {
  const slug = (location.pathname.match(/^\/([^/]+)\//) || [])[1];
  return (slug && PROJECT_PAGES[slug]) || null;
}

// Tabler arrow-left at 16px with stroke 2 — matches shadcn pagination weight.
const ARROW_LEFT_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l14 0"/><path d="M5 12l6 6"/><path d="M5 12l6 -6"/></svg>';

function isCurrentPage(href) {
  const here = location.pathname.replace(/\/index\.html$/, "/");
  const there = href.replace(/\/index\.html$/, "/");
  return here === there;
}

// Build the sidebar for the current project. Wrap the content in a shell so the
// sidebar can sit beside it as a sticky left column (shadcn-style layout).
function injectSidebar() {
  // No project pages (site root, or an unknown project) → leave it chrome-free.
  const pages = currentProjectPages();
  if (!pages) return;
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
  // Focus holder: opening the drawer moves focus here (not the first link, which
  // would show a stray focus ring) so keyboard/Esc work with nothing highlighted.
  aside.tabIndex = -1;
  // Inner spans give us shadcn-style pill hover: the anchor stays full width
  // for a wide click target, but the visual bg wraps only the label.
  const backLink = `<a class="sidebar__back" href="/"><span>${ARROW_LEFT_ICON}All projects</span></a>`;
  aside.innerHTML =
    backLink +
    pages
      .map(
        (g) => `
      <div class="sidebar__group">
        <p class="sidebar__group-title">${g.group}</p>
        ${g.links
          .map(
            (l) =>
              `<a class="sidebar__link${isCurrentPage(l.href) ? " is-active" : ""}" href="${l.href}"><span>${l.label}${l.new ? '<i class="sidebar__new" aria-hidden="true"></i>' : ""}</span></a>`
          )
          .join("")}
      </div>`
      )
      .join("");

  const backdrop = document.createElement("div");
  backdrop.className = "sidebar-backdrop";

  const shell = region ? region.closest(".shell") : null;
  if (shell) shell.insertBefore(aside, region);
  else document.body.append(aside);
  document.body.append(backdrop);
  wireSidebar(aside, backdrop);
  persistSidebarScroll(aside);
}

// Keep the sidebar where you left it across page loads (shadcn-style persistent
// sidebar). Each page is a fresh document, so cross-document view transitions
// otherwise render the new sidebar at the top and scroll the active item out of
// view. sessionStorage keeps the offset per tab, keyed by project so separate
// sidebars don't clobber each other. Restore runs synchronously here — app.js is
// deferred and the sidebar was just appended — so it applies before first paint,
// no flash. Save on pagehide, which also covers the bfcache case.
function persistSidebarScroll(aside) {
  const key = `sidebar-scroll:${location.pathname.split("/")[1] || ""}`;
  try {
    const saved = sessionStorage.getItem(key);
    if (saved !== null) aside.scrollTop = +saved;
  } catch {
    /* storage may be unavailable; sidebar just starts at the top */
  }
  window.addEventListener("pagehide", () => {
    try {
      sessionStorage.setItem(key, aside.scrollTop);
    } catch {
      /* storage may be unavailable; scroll simply won't persist */
    }
  });
}

function wireSidebar(aside, backdrop) {
  const menuBtn = document.querySelector(".site-nav__menu");
  const region = document.querySelector(".content-region");
  // Enable animation transiently for the duration of an actual open/close.
  // If .is-anim persisted, a later resize across the mobile breakpoint would
  // animate the drawer's default → hidden state and cause a fade on resize.
  let animTimer;
  const animate = () => {
    aside.classList.add("is-anim");
    clearTimeout(animTimer);
    animTimer = setTimeout(() => aside.classList.remove("is-anim"), 250);
  };
  const isOpen = () => aside.classList.contains("is-open");

  const onKeydown = (e) => {
    if (e.key === "Escape") close(true);
  };

  const open = () => {
    animate();
    aside.classList.add("is-open");
    backdrop.classList.add("is-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
    // Modal-style: the rest of the page is inert (not focusable/clickable)
    // while the drawer is open, and focus moves into it. No scroll-lock —
    // the page keeps its single, always-hidden scrollbar.
    if (region) region.inert = true;
    document.addEventListener("keydown", onKeydown);
    aside.focus({ preventScroll: true });
  };

  // restoreFocus: return focus to the menu button on a user-driven close, but
  // not when a resize to desktop auto-closes (the button is hidden there).
  const close = (restoreFocus) => {
    if (!isOpen()) return;
    animate();
    aside.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    if (region) region.inert = false;
    document.removeEventListener("keydown", onKeydown);
    if (restoreFocus && menuBtn) menuBtn.focus();
  };

  if (menuBtn) {
    menuBtn.addEventListener("click", () => (isOpen() ? close(true) : open()));
  }
  backdrop.addEventListener("click", () => close(true));
  aside.addEventListener("click", (e) => {
    // A link click navigates away; close without stealing focus back.
    if (e.target.closest(".sidebar__link")) close(false);
  });
  // Crossing to desktop turns the drawer into a static column — force it closed
  // so `inert` can't strand the (now visible) main content.
  window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => {
    if (e.matches) close(false);
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
  {
    title: "Primary",
    note: "Solid for filled controls, soft for tinted surfaces, foreground for text sitting on the soft surface (matters most in dark theme).",
    tokens: ["primary", "primary-foreground", "primary-soft"]
  },
  {
    title: "Tints",
    note: "Solid + soft alpha. The solid doubles as text on its own soft background.",
    tokens: [
      "red",
      "red-soft",
      "amber",
      "amber-soft",
      "green",
      "green-soft",
      "blue",
      "blue-soft",
      "fuchsia",
      "fuchsia-soft"
    ]
  },
  {
    title: "Focus",
    note: "A lighter, softer tone derived from the primary, so it retints with the brand.",
    tokens: ["focus"]
  },
  { title: "Overlay", note: "Modal and drawer backdrops.", tokens: ["overlay"] },
  {
    title: "Fill",
    note: "Alpha tints for hovers, presses, selected rows, and dividers.",
    tokens: ["fill-primary", "fill-secondary", "fill-tertiary", "fill-quaternary"]
  }
];

const PALETTE_STATES = ["default", "hover", "active"];

function renderPaletteFamily(family) {
  const headerCells = PALETTE_STATES.map(
    (s) => `<th class="palette-table__state">${s[0].toUpperCase() + s.slice(1)}</th>`
  ).join("");
  const rows = family.tokens
    .map((base) => {
      const cells = PALETTE_STATES.map((s) => {
        const token = s === "default" ? base : `${base}-${s}`;
        return `<td class="palette-table__state"><button type="button" class="palette-swatch" data-token="${token}" aria-label="Copy ${token}"></button></td>`;
      }).join("");
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

// A hidden probe lets the browser resolve any token — color-mix, relative
// rgb(from …), var() chains — down to a concrete sRGB value we can serialise.
// So swatches copy a clean, paste-ready hex (#6C2BF5) instead of the authored
// expression, always in sync with the tokens because it's read live, never
// stored. See-through tokens copy as 8-digit hex (#404040B3).
let colorProbe;
function tokenToHex(token) {
  if (!colorProbe) {
    colorProbe = document.createElement("span");
    colorProbe.style.cssText = "position:absolute;width:0;height:0;visibility:hidden";
    document.body.appendChild(colorProbe);
  }
  colorProbe.style.color = `var(--${token})`;
  const computed = getComputedStyle(colorProbe).color; // rgb(…) / rgba(…)
  const parts = computed.match(/[\d.]+/g);
  if (!computed.startsWith("rgb") || !parts) return null;
  const [r, g, b, a] = parts.map(Number);
  const h = (n) => Math.round(n).toString(16).padStart(2, "0");
  let hex = `#${h(r)}${h(g)}${h(b)}`;
  if (a !== undefined && a < 1) hex += h(a * 255); // 8-digit only when alpha < 1
  return hex.toUpperCase();
}

// Fill each swatch's colour from its :root token; copy target is the resolved
// hex (falls back to the raw value if a browser won't serialise it as rgb).
function hydratePalette() {
  const rootStyle = getComputedStyle(document.documentElement);
  document.querySelectorAll(".palette-swatch").forEach((el) => {
    const { token } = el.dataset;
    if (!token) return;
    const value = rootStyle.getPropertyValue(`--${token}`).trim();
    if (!value) return;
    el.style.setProperty("--c", value);
    el.dataset.copy = tokenToHex(token) || value;
  });
}

// Append a two-part arrow to each .link-list anchor. On hover the horizontal
// line fades in and the chevron slides right, so the arrow "grows" out of the
// text. Injected here so the intro HTML stays lean.
const LINK_ARROW_SVG =
  '<svg class="link-arrow" viewBox="0 0 12 12" fill="none" aria-hidden="true">' +
  '<path class="link-arrow__line" d="M1.5 6h8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<g class="link-arrow__chevron"><path d="M3.5 2l4 4-4 4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></g>' +
  "</svg>";

// Landing-page link lists rendered from PROJECT_PAGES (the same source as the
// sidebar) so they can't drift out of sync. A <ul data-project-group="…">
// is filled with that group's links, minus the current page (skips the intro's
// own self-link). Run before hydrateLinkListArrows so the arrows land on these.
function hydrateProjectLinks() {
  const pages = currentProjectPages();
  if (!pages) return;
  document.querySelectorAll("[data-project-group]").forEach((ul) => {
    const group = pages.find((g) => g.group === ul.dataset.projectGroup);
    if (!group) return;
    ul.innerHTML = group.links
      .filter((l) => !isCurrentPage(l.href))
      .map((l) => `<li><a href="${l.href}">${l.label}</a></li>`)
      .join("");
  });
}

function hydrateLinkListArrows() {
  document.querySelectorAll(".link-list a").forEach((a) => {
    if (a.querySelector(".link-arrow")) return;
    a.insertAdjacentHTML("beforeend", LINK_ARROW_SVG);
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
    // Computed line-height is "normal" (parseFloat → NaN) when no token drives
    // it; print "normal" rather than "NaN".
    const lhComputed = parseFloat(cs.lineHeight);
    const lh = lhRaw || (Number.isNaN(lhComputed) ? "normal" : Math.round(lhComputed));
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
  // Layout-page grid tokens (--grid-columns etc.) change with viewport, so re-hydrate.
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
    // Append --surface-rim so the chip matches a real elevated surface — a
    // no-op in light, the top-edge highlight in dark.
    if (shadow) shadow.style.boxShadow = `${value}, var(--surface-rim)`;
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
  const tabs = tabList.querySelectorAll(".docs-tabs__tab");
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

// Tabler arrow-right at 16px, stroke 2 — matches ARROW_LEFT_ICON.
const ARROW_RIGHT_16 =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l14 0"/><path d="M13 18l6 -6"/><path d="M13 6l6 6"/></svg>';

// Inject a shadcn-style prev/next pair at the bottom of each doc page.
function injectPagination() {
  const wrap = document.querySelector(".wrap");
  if (!wrap || document.querySelector(".pager")) return;
  const pages = currentProjectPages();
  if (!pages) return;
  const flat = pages.flatMap((g) => g.links);
  const idx = flat.findIndex((l) => isCurrentPage(l.href));
  if (idx < 0) return;
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx < flat.length - 1 ? flat[idx + 1] : null;
  if (!prev && !next) return;
  const nav = document.createElement("nav");
  nav.className = "pager";
  nav.setAttribute("aria-label", "Docs pagination");
  const parts = [];
  if (prev) {
    parts.push(
      `<a class="pager__link pager__link--prev" href="${prev.href}">${ARROW_LEFT_ICON}<span>${prev.label}</span></a>`
    );
  }
  if (next) {
    parts.push(
      `<a class="pager__link pager__link--next" href="${next.href}"><span>${next.label}</span>${ARROW_RIGHT_16}</a>`
    );
  }
  nav.innerHTML = parts.join("");
  wrap.appendChild(nav);
}

const COPY_ICON =
  '<svg class="code-copy__copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z"/><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1"/></svg>';
const CHECK_ICON =
  '<svg class="code-copy__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5l10 -10"/></svg>';

function injectCodeCopy() {
  document.querySelectorAll("pre").forEach((pre) => {
    if (pre.parentElement?.classList.contains("code-block")) return;
    const code = pre.querySelector("code");
    if (!code) return;
    const wrapper = document.createElement("div");
    wrapper.className = "code-block";
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-copy";
    btn.setAttribute("aria-label", "Copy code");
    btn.innerHTML = COPY_ICON + CHECK_ICON;
    wrapper.appendChild(btn);
  });
}

// Custom select: a styled trigger + a floating listbox. Native <select> is the
// default; this is for when option rendering needs to be custom. Handles
// open/close, click + keyboard selection (arrows/Enter/Esc), and click-away.
function initSelects() {
  document.querySelectorAll("[data-select]").forEach((root) => {
    const trigger = root.querySelector(".select__trigger");
    const list = root.querySelector(".select__list");
    const valueEl = root.querySelector(".select__value");
    const options = [...root.querySelectorAll(".select__option")];
    if (!trigger || !list || !options.length) return;

    let activeIndex = options.findIndex((o) => o.getAttribute("aria-selected") === "true");
    // Focus stays on the trigger the whole time (the list is never focused), so
    // Tab/Shift+Tab move through the page normally — no focus trap. The active
    // option is tracked with .is-active + aria-activedescendant.
    options.forEach((o, i) => {
      if (!o.id) o.id = `${root.id || "select"}-opt-${i}`;
    });
    // Labels are static — lowercase them once for type-ahead instead of per key.
    const optionLabels = options.map((o) => o.textContent.trim().toLowerCase());

    const setActive = (i) => {
      activeIndex = (i + options.length) % options.length;
      const opt = options[activeIndex];
      options.forEach((o, idx) => o.classList.toggle("is-active", idx === activeIndex));
      opt.scrollIntoView({ block: "nearest" });
      trigger.setAttribute("aria-activedescendant", opt.id);
    };
    const open = () => {
      if (!list.hidden) return;
      list.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      setActive(activeIndex < 0 ? 0 : activeIndex);
    };
    const close = () => {
      if (list.hidden) return;
      list.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      trigger.removeAttribute("aria-activedescendant");
    };
    const select = (i) => {
      options.forEach((o, idx) => o.setAttribute("aria-selected", String(idx === i)));
      if (valueEl) valueEl.textContent = options[i].textContent.trim();
      activeIndex = i;
      close();
    };

    // Type-ahead: jump to the next option whose label starts with the typed
    // string. The buffer clears after a pause so a fresh keystroke starts over.
    let typeahead = "";
    let typeaheadTimer;
    const matchTypeahead = (char) => {
      clearTimeout(typeaheadTimer);
      typeahead += char.toLowerCase();
      typeaheadTimer = setTimeout(() => {
        typeahead = "";
      }, 500);
      // A single-char buffer advances past the current option; a growing buffer
      // keeps refining the current one.
      const from = typeahead.length === 1 ? activeIndex + 1 : activeIndex;
      for (let n = 0; n < options.length; n += 1) {
        const idx = (from + n) % options.length;
        if (optionLabels[idx].startsWith(typeahead)) {
          setActive(idx);
          return;
        }
      }
    };

    // Open on keyboard focus (matches Ruter); mouse focus isn't :focus-visible,
    // so a click toggles instead of double-firing here.
    trigger.addEventListener("focus", () => {
      if (trigger.matches(":focus-visible")) open();
    });
    trigger.addEventListener("click", () => (list.hidden ? open() : close()));

    // Actions for each nav key while the list is open. The same keys also open a
    // closed list (Enter/Space just reveal it, matching a trigger click).
    const keyActions = {
      ArrowDown: () => setActive(activeIndex + 1),
      ArrowUp: () => setActive(activeIndex - 1),
      Home: () => setActive(0),
      End: () => setActive(options.length - 1),
      Enter: () => select(activeIndex),
      " ": () => select(activeIndex)
    };

    trigger.addEventListener("keydown", (e) => {
      if (e.key === "Escape" || e.key === "Tab") {
        close();
        return;
      }
      if (list.hidden) {
        if (e.key in keyActions) {
          e.preventDefault();
          open();
          // Enter/Space/arrows just open; Home/End also jump within the list.
          if (e.key === "Home" || e.key === "End") keyActions[e.key]();
          return;
        }
      } else if (e.key in keyActions) {
        e.preventDefault();
        keyActions[e.key]();
        return;
      }
      // Printable character → type-ahead (opening the list first if needed).
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (list.hidden) open();
        matchTypeahead(e.key);
      }
    });
    options.forEach((o, i) => {
      // Keep focus on the trigger when clicking an option.
      o.addEventListener("mousedown", (e) => e.preventDefault());
      o.addEventListener("click", () => select(i));
      o.addEventListener("mousemove", () => setActive(i));
    });
    document.addEventListener("click", (e) => {
      if (!root.contains(e.target)) close();
    });
    root.addEventListener("focusout", (e) => {
      if (!root.contains(e.relatedTarget)) close();
    });
  });
}

// Place a popover under its invoker (flipping up when cramped, clamped to the
// viewport). The stylesheet does this declaratively via CSS anchor positioning;
// this is the fallback for engines that lack it (Firefox today).
function positionPopover(trigger, pop) {
  const GAP = 4;
  const PAD = 8;
  const t = trigger.getBoundingClientRect();
  const p = pop.getBoundingClientRect();
  let top = t.bottom + GAP;
  if (top + p.height + PAD > window.innerHeight && t.top - p.height - GAP > 0) {
    top = t.top - p.height - GAP;
  }
  // Start-aligned to the trigger by default; --center aligns to its midpoint.
  const anchorLeft = pop.classList.contains("popover--center")
    ? t.left + t.width / 2 - p.width / 2
    : t.left;
  const left = Math.max(PAD, Math.min(anchorLeft, window.innerWidth - p.width - PAD));
  pop.style.left = `${Math.round(left)}px`;
  pop.style.top = `${Math.round(top)}px`;
}

// Position every invoker-driven .popover on open, but only where CSS anchor
// positioning is unsupported — otherwise the stylesheet owns placement. Covers
// both the dropdown surface and standalone popovers; initMenus handles only the
// menu keyboard model on top.
function initPopovers() {
  const supportsAnchor = CSS.supports("position-area", "bottom");
  document.querySelectorAll(".popover[id]").forEach((pop) => {
    const trigger = document.querySelector(`[popovertarget="${pop.id}"]`);
    if (!trigger) return;

    if (!supportsAnchor) {
      pop.addEventListener("toggle", (e) => {
        if (e.newState === "open") positionPopover(trigger, pop);
      });
    }

    // A native auto-popover only light-dismisses on outside click / Esc, so it
    // lingers when you Tab away. Close once focus leaves the trigger+popover
    // group (Tab into the popover's own content keeps it open). The menu runs
    // its own keyboard model, so leave those to initMenus.
    if (!pop.classList.contains("menu__list")) {
      const onFocusOut = (e) => {
        const to = e.relatedTarget;
        if (to && to !== trigger && !pop.contains(to)) pop.hidePopover();
      };
      trigger.addEventListener("focusout", onFocusOut);
      pop.addEventListener("focusout", onFocusOut);
    }
  });
}

// Dropdown menu (menu-button pattern) on the native Popover API: the trigger's
// popovertarget gives top-layer rendering, light-dismiss, Esc, and focus-return
// for free. app.js adds the menu keyboard model — focus moves INTO the menu and
// roves across items (arrow keys), items carry tabindex="-1" so Tab leaves —
// plus type-ahead. Fallback positioning lives in initPopovers.
function initMenus() {
  document.querySelectorAll(".menu").forEach((root) => {
    const trigger = root.querySelector(".menu__trigger");
    const list = root.querySelector(".menu__list");
    if (!trigger || !list || !list.popover) return;
    // Re-read each time so disabled items are skipped by keyboard navigation.
    const items = () => [...list.querySelectorAll(".menu__item:not([disabled])")];
    const focusItem = (i) => {
      const els = items();
      if (els.length) els[(i + els.length) % els.length].focus();
    };

    // The native popover owns show/hide; react to its toggle to sync the
    // trigger state and move focus in. (Fallback positioning is in initPopovers.)
    let openEdge = "first";
    list.addEventListener("toggle", (e) => {
      const open = e.newState === "open";
      trigger.setAttribute("aria-expanded", String(open));
      if (!open) return;
      focusItem(openEdge === "last" ? -1 : 0);
      openEdge = "first";
    });

    // Arrow keys open a closed menu (Enter/Space are the button's native
    // toggle); Down lands on the first item, Up on the last.
    trigger.addEventListener("keydown", (e) => {
      if (list.matches(":popover-open")) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        openEdge = e.key === "ArrowUp" ? "last" : "first";
        list.showPopover();
      }
    });

    // Type-ahead: jump to the next item whose label starts with the typed
    // buffer; the buffer clears after a short pause.
    let buf = "";
    let bufTimer;
    list.addEventListener("keydown", (e) => {
      const els = items();
      const current = els.indexOf(document.activeElement);
      // Esc/outside-click dismissal are the popover's job; Tab just closes and
      // moves on through the page.
      if (e.key === "Tab") {
        list.hidePopover();
        return;
      }
      const nav = {
        ArrowDown: () => focusItem(current + 1),
        ArrowUp: () => focusItem(current - 1),
        Home: () => focusItem(0),
        End: () => focusItem(-1)
      };
      if (e.key in nav) {
        e.preventDefault();
        nav[e.key]();
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        clearTimeout(bufTimer);
        buf += e.key.toLowerCase();
        bufTimer = setTimeout(() => (buf = ""), 500);
        const from = buf.length === 1 ? current + 1 : current;
        for (let n = 0; n < els.length; n += 1) {
          const idx = (from + n) % els.length;
          if (els[idx].textContent.trim().toLowerCase().startsWith(buf)) {
            els[idx].focus();
            return;
          }
        }
      }
    });

    // Activating an item would run its action; the demo items are placeholders,
    // so just dismiss — the popover hands focus back to the trigger.
    list.addEventListener("click", (e) => {
      if (e.target.closest(".menu__item")) list.hidePopover();
    });
  });
}

// Pagination: renders a bounded page window and keeps it interactive. The
// window always shows the first and last page, the current page ±1, and an
// ellipsis wherever there's a gap — the standard pattern. Seed with data-total
// and data-page; clicking a number or prev/next re-renders in place.
function initPagination() {
  const chevron = (d) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}" /></svg>`;
  const CHEVRON_LEFT = chevron("M15 6l-6 6l6 6");
  const CHEVRON_RIGHT = chevron("M9 6l6 6l-6 6");

  // Pages to show: 1, current-1..current+1, total — with "ellipsis" markers
  // where the sequence skips. Clamped so the ends never duplicate a neighbour.
  const windowed = (current, total) => {
    const out = [1];
    const left = Math.max(2, current - 1);
    const right = Math.min(total - 1, current + 1);
    if (left > 2) out.push("ellipsis");
    for (let i = left; i <= right; i += 1) out.push(i);
    if (right < total - 1) out.push("ellipsis");
    if (total > 1) out.push(total);
    return out;
  };

  document.querySelectorAll("[data-pagination]").forEach((nav) => {
    const total = Math.max(1, parseInt(nav.dataset.total, 10) || 1);
    let current = Math.min(total, Math.max(1, parseInt(nav.dataset.page, 10) || 1));

    const pageItem = (p) =>
      `<li><button type="button" class="pagination__link" data-key="p${p}"${
        p === current ? ' aria-current="page"' : ""
      }>${p}</button></li>`;
    const navItem = (dir, disabled) => {
      const label = dir === "prev" ? "Previous page" : "Next page";
      const glyph = dir === "prev" ? CHEVRON_LEFT : CHEVRON_RIGHT;
      return `<li><button type="button" class="pagination__link" data-key="${dir}" data-nav="${dir}" aria-label="${label}"${
        disabled ? " disabled" : ""
      }>${glyph}</button></li>`;
    };

    const render = (focusKey) => {
      const items = [navItem("prev", current === 1)];
      windowed(current, total).forEach((p) => {
        items.push(
          p === "ellipsis"
            ? '<li><span class="pagination__ellipsis" aria-hidden="true">…</span></li>'
            : pageItem(p)
        );
      });
      items.push(navItem("next", current === total));
      nav.innerHTML = `<ul class="pagination__list">${items.join("")}</ul>`;
      if (focusKey) nav.querySelector(`[data-key="${focusKey}"]`)?.focus();
    };

    nav.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-key]");
      if (!btn || btn.disabled) return;
      const dir = btn.dataset.nav;
      if (dir === "prev") current = Math.max(1, current - 1);
      else if (dir === "next") current = Math.min(total, current + 1);
      else current = parseInt(btn.dataset.key.slice(1), 10);
      // Keep focus on the pressed control; if a nav button just disabled itself
      // at an edge, fall back to the now-current page so focus isn't lost.
      let focusKey = btn.dataset.key;
      if (dir === "prev" && current === 1) focusKey = `p${current}`;
      else if (dir === "next" && current === total) focusKey = `p${current}`;
      render(focusKey);
    });

    render();
  });
}

// Slider: keep --slider-fill in sync with the value so WebKit/Chrome can paint
// the filled part of the track (Firefox uses ::-moz-range-progress natively),
// and mirror the value into the field's <output> when there is one.
function initSliders() {
  const sync = (el, out) => {
    const min = Number(el.min) || 0;
    const max = el.max === "" ? 100 : Number(el.max);
    const pct = max === min ? 0 : ((Number(el.value) - min) / (max - min)) * 100;
    el.style.setProperty("--slider-fill", `${pct}%`);
    if (out) out.textContent = el.value;
  };
  document.querySelectorAll(".slider").forEach((el) => {
    const out = el.closest(".slider-field")?.querySelector(".slider-field__value");
    sync(el, out);
    el.addEventListener("input", () => sync(el, out));
  });
}

// Tooltip positioning: flip above/below by available space and clamp to the
// viewport, keeping the arrow pointed at the trigger. CSS handles the fade.
function initTooltips() {
  const PAD = 8;
  const GAP = 8;
  let uid = 0;
  document.querySelectorAll(".tooltip").forEach((root) => {
    const bubble = root.querySelector(".tooltip__bubble");
    // The trigger is whichever child isn't the bubble — don't assume position.
    const trigger = root.querySelector(":scope > :not(.tooltip__bubble)");
    if (!bubble || !trigger) return;
    // Associate the bubble with the trigger so assistive tech announces it.
    if (!bubble.id) bubble.id = `tooltip-${(uid += 1)}`;
    trigger.setAttribute("aria-describedby", bubble.id);

    const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

    const place = () => {
      const t = trigger.getBoundingClientRect();
      const b = bubble.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Preferred side (data-tooltip-side), flipped to the opposite if it
      // wouldn't fit.
      let side = root.dataset.tooltipSide || "top";
      if (side === "top" && t.top - b.height - GAP < 0) side = "bottom";
      else if (side === "bottom" && t.bottom + b.height + GAP > vh) side = "top";
      else if (side === "left" && t.left - b.width - GAP < 0) side = "right";
      else if (side === "right" && t.right + b.width + GAP > vw) side = "left";
      bubble.dataset.placement = side;

      let top;
      let left;
      let arrow;
      if (side === "top" || side === "bottom") {
        top = side === "top" ? t.top - b.height - GAP : t.bottom + GAP;
        const cx = t.left + t.width / 2;
        left = clamp(cx - b.width / 2, PAD, vw - b.width - PAD);
        arrow = clamp(cx - left, 10, b.width - 10);
      } else {
        left = side === "left" ? t.left - b.width - GAP : t.right + GAP;
        const cy = t.top + t.height / 2;
        top = clamp(cy - b.height / 2, PAD, vh - b.height - PAD);
        arrow = clamp(cy - top, 10, b.height - 10);
      }
      bubble.style.top = `${Math.round(top)}px`;
      bubble.style.left = `${Math.round(left)}px`;
      bubble.style.setProperty("--tt-arrow", `${Math.round(arrow)}px`);
    };
    const hide = () => {
      bubble.classList.remove("is-visible");
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("keydown", onKeydown, true);
    };
    const onScroll = () => hide();
    // WCAG 1.4.13: a hover/focus tooltip must be dismissible with Escape
    // without moving the pointer or focus.
    const onKeydown = (e) => {
      if (e.key === "Escape") hide();
    };
    const show = () => {
      place();
      bubble.classList.add("is-visible");
      // Fixed-position bubble would float away from the trigger on scroll —
      // just dismiss it instead.
      window.addEventListener("scroll", onScroll, { capture: true, passive: true });
      document.addEventListener("keydown", onKeydown, true);
    };

    root.addEventListener("mouseenter", show);
    root.addEventListener("mouseleave", hide);
    root.addEventListener("focusin", show);
    root.addEventListener("focusout", hide);
  });
}

function init() {
  // iOS Safari only fires :active on tap when a touch listener exists somewhere
  // in the document. A no-op on the document enables every component's pressed
  // state on touch (full JS apps like Ruter get this for free from their own
  // listeners; a static site has to opt in).
  document.addEventListener("touchstart", () => {}, { passive: true });

  toast.mount();
  injectNav();
  injectSkipLink();
  injectSidebar();
  injectPagination();
  injectCodeCopy();
  hydrateProjectLinks();
  hydrateLinkListArrows();
  renderPalette();
  hydratePalette();
  hydratePreviews();
  initGridTabs();
  initSelects();
  initPopovers();
  initMenus();
  initPagination();
  initSliders();
  initTooltips();
  refreshResponsive();

  let frame;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(refreshResponsive);
  });

  document.addEventListener("click", (event) => {
    // Placeholder demo links (href="#") shouldn't scroll to top or add a hash.
    const placeholder = event.target.closest('a[href="#"]');
    if (placeholder) {
      event.preventDefault();
      return;
    }
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
    const codeCopy = event.target.closest(".code-copy");
    if (codeCopy) {
      const code = codeCopy.parentElement.querySelector("code");
      if (!code) return;
      navigator.clipboard
        .writeText(code.textContent)
        .then(() => {
          codeCopy.classList.add("is-copied");
          clearTimeout(codeCopy._copyTimer);
          codeCopy._copyTimer = setTimeout(() => codeCopy.classList.remove("is-copied"), 2000);
        })
        .catch(() => toast("Copy failed"));
      return;
    }
    const dialogOpen = event.target.closest("[data-dialog-open]");
    if (dialogOpen) {
      const dlg = document.getElementById(dialogOpen.dataset.dialogOpen);
      if (dlg && typeof dlg.showModal === "function") dlg.showModal();
      return;
    }
    const dialogClose = event.target.closest("[data-dialog-close]");
    if (dialogClose) {
      dialogClose.closest("dialog")?.close();
      return;
    }
    // Click on the backdrop (target is the <dialog> itself, not its inner
    // content). Hit-test against the dialog's box so a click on the element's
    // own padding doesn't count as a backdrop click. Covers Dialog and Sheet —
    // both are native <dialog>s sharing the data-dialog-open/close wiring.
    const openDialog = event.target.closest("dialog.dialog, dialog.sheet");
    if (openDialog && event.target === openDialog) {
      const r = openDialog.getBoundingClientRect();
      const inBox =
        event.clientX >= r.left &&
        event.clientX <= r.right &&
        event.clientY >= r.top &&
        event.clientY <= r.bottom;
      if (!inBox) openDialog.close();
      return;
    }
    const toastBtn = event.target.closest("[data-toast]");
    if (toastBtn) {
      const type = toastBtn.dataset.toastType;
      toast(toastBtn.dataset.toast || "Saved", type ? { type } : undefined);
      return;
    }
    const toastPromiseBtn = event.target.closest("[data-toast-promise]");
    if (toastPromiseBtn) {
      toast.promise(new Promise((resolve) => setTimeout(resolve, 1600)), {
        loading: "Saving…",
        success: "Saved",
        error: "Couldn't save"
      });
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
