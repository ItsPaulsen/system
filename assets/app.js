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
  let politeEl;
  let assertiveEl;
  let timer;
  // Visually-hidden style for the announce-only live regions.
  const SR_ONLY =
    "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;";
  // Mount the pill + both live regions up front (idempotent) so a first
  // announcement isn't injected and populated in the same tick — some screen
  // readers miss that. The visible pill is aria-hidden; the message is announced
  // through a persistent region of the right politeness. Swapping role/aria-live
  // on one shared node per message is unreliable across readers, so keep both.
  const ensure = () => {
    if (el) return;
    el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("aria-hidden", "true");
    iconEl = document.createElement("span");
    iconEl.className = "toast__icon";
    textEl = document.createElement("span");
    textEl.className = "toast__text";
    el.append(iconEl, textEl);
    politeEl = document.createElement("div");
    politeEl.setAttribute("role", "status");
    politeEl.setAttribute("aria-live", "polite");
    politeEl.style.cssText = SR_ONLY;
    assertiveEl = document.createElement("div");
    assertiveEl.setAttribute("role", "alert");
    assertiveEl.setAttribute("aria-live", "assertive");
    assertiveEl.style.cssText = SR_ONLY;
    document.body.append(el, politeEl, assertiveEl);
  };
  const render = (message, type = "default") => {
    ensure();
    // error/warning are interruptive, assertive so they aren't queued behind
    // whatever a polite region is already reading.
    const assertive = type === "error" || type === "warning";
    el.dataset.type = type;
    // Loading uses the ring spinner (matches the Spinner component); the other
    // types use their semantic Tabler glyph.
    let iconMarkup = "";
    if (type === "loading") iconMarkup = '<span class="toast__spinner"></span>';
    else if (ICONS[type]) iconMarkup = svg(type);
    iconEl.innerHTML = iconMarkup;
    textEl.textContent = message;
    el.classList.add("is-visible");
    // Announce via the matching persistent region; clear the other so a stale
    // message can't be re-read.
    (assertive ? assertiveEl : politeEl).textContent = message;
    (assertive ? politeEl : assertiveEl).textContent = "";
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
  // Suppress transitions across the swap, otherwise every element with a
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
  // Make the skip target a real main landmark (docs pages ship no <main>; the
  // sidebar <aside> lives outside .wrap, so main wraps only the page content).
  if (!wrap.hasAttribute("role")) wrap.setAttribute("role", "main");
  const a = document.createElement("a");
  a.className = "skip-link";
  a.href = `#${wrap.id}`;
  a.textContent = "Skip to content";
  document.body.prepend(a);
}

function injectNav() {
  if (document.querySelector(".site-nav")) return;
  // The example is a standalone product mock with its own nav, no docs chrome.
  if (isExamplePath()) return;
  const nav = document.createElement("header");
  nav.className = "site-nav";
  const isRoot = location.pathname === "/" || location.pathname === "/index.html";
  // Root landing: no project to label and nothing to scroll under, so the nav
  // drops its brand and its surface, just the theme toggle floating on the page.
  if (isRoot) nav.classList.add("site-nav--bare");
  // Icons are Tabler (tabler.io, MIT), inlined so the shell stays
  // dependency-free. `menu` is a custom two-line mark that morphs into a close
  // (X) via CSS; the rest are Tabler paths. The hamburger keeps its own
  // stroke-width in CSS (.ham-line) so the shared stroke-width below is free to
  // match Tabler's default of 2.
  const tabler = {
    menu: '<line class="ham-line ham-line--top" x1="4" x2="20" y1="9" y2="9"/><line class="ham-line ham-line--bot" x1="4" x2="20" y1="15" y2="15"/>',
    sun: '<path d="M14.828 14.828a4 4 0 1 0 -5.656 -5.656a4 4 0 0 0 5.656 5.656z"/><path d="M6.343 17.657l-1.414 1.414"/><path d="M6.343 6.343l-1.414 -1.414"/><path d="M17.657 6.343l1.414 -1.414"/><path d="M17.657 17.657l1.414 1.414"/><path d="M4 12l-2 0"/><path d="M12 4l0 -2"/><path d="M20 12l2 0"/><path d="M12 20l0 2"/>',
    moon: '<path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/>',
    "arrow-left": '<path d="M5 12l14 0"/><path d="M5 12l6 6"/><path d="M5 12l6 -6"/>',
    "brand-github":
      '<path d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5"/>'
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
  // a sidebar exists, not the root landing, not an unknown project.
  const menuBtn = currentProjectPages()
    ? `<button class="site-nav__menu" type="button" aria-label="Toggle menu" aria-expanded="false">${icon("menu", 24)}</button>`
    : "";

  // Single entry point into the composed example, shown on every docs page of a
  // project (not the root landing). Opens in a new tab so the docs stay put and
  // the example needs no back affordance of its own.
  const exampleBtn = currentProjectPages()
    ? `<a class="btn btn--outline" href="${EXAMPLE_HREF}" target="_blank" rel="noopener">Example</a>`
    : "";

  // Typeahead over this project's pages. Only where a sidebar exists; the
  // results list is populated + wired in wireSearch() once the DOM is ready.
  const searchInput = currentProjectPages()
    ? `<div class="site-nav__search-wrap">
          <input class="site-nav__search" type="search" placeholder="Search…" aria-label="Search this project" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-controls="nav-search-results" aria-autocomplete="list" />
          <ul class="site-nav__results" id="nav-search-results" role="listbox" hidden></ul>
        </div>`
    : "";

  nav.innerHTML = `
    <div class="site-nav__inner">
      <div class="site-nav__left">
        ${menuBtn}
        ${isRoot ? "" : `<a class="site-nav__brand" href="${projectHref}"></a>`}
      </div>
      <div class="site-nav__right">
        ${searchInput}
        ${searchInput ? '<span class="site-nav__divider" aria-hidden="true"></span>' : ""}
        ${exampleBtn}
        ${exampleBtn ? '<span class="site-nav__divider" aria-hidden="true"></span>' : ""}
        <a class="site-nav__source" href="https://github.com/ItsPaulsen/system" target="_blank" rel="noopener" aria-label="View source on GitHub">${icon("brand-github", 18)}</a>
        <button class="theme-toggle" type="button" aria-label="Switch theme">
          ${icon("sun", 18, "icon-sun")}${icon("moon", 18, "icon-moon")}
        </button>
      </div>
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
// dropping a new key here, the sidebar, back link, and pagination all follow.
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
        { label: "Calendar", href: "/demo/components/calendar/" },
        { label: "Card", href: "/demo/components/card/" },
        { label: "Checkbox", href: "/demo/components/checkbox/" },
        { label: "Combobox", href: "/demo/components/combobox/" },
        { label: "Dialog", href: "/demo/components/dialog/" },
        { label: "Dropdown Menu", href: "/demo/components/dropdown/" },
        { label: "Empty", href: "/demo/components/empty/" },
        { label: "Filter Chips", href: "/demo/components/chip/" },
        { label: "Input", href: "/demo/components/input/" },
        { label: "Input Group", href: "/demo/components/input-group/" },
        { label: "Link", href: "/demo/components/link/" },
        { label: "Native Select", href: "/demo/components/native-select/" },
        { label: "Navigation Menu", href: "/demo/components/navigation-menu/" },
        { label: "Pagination", href: "/demo/components/pagination/" },
        { label: "Popover", href: "/demo/components/popover/" },
        { label: "Progress", href: "/demo/components/progress/" },
        { label: "Radio Group", href: "/demo/components/radio/" },
        { label: "Select", href: "/demo/components/select/" },
        { label: "Separator", href: "/demo/components/separator/" },
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

// The composed "components in a real UI" example, one mini-product (Home →
// Blog → Article → Settings) that navigates itself. It's reached from the
// Example button in the docs nav and opens in its own tab. These screens bring
// their own chrome, so the docs nav + sidebar opt out on this path (below).
const EXAMPLE_HREF = "/demo/example/";
function isExamplePath() {
  return location.pathname.startsWith(EXAMPLE_HREF);
}

// Tabler arrow-left at 16px with stroke 2, the usual pagination weight.
const ARROW_LEFT_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l14 0"/><path d="M5 12l6 6"/><path d="M5 12l6 -6"/></svg>';

function isCurrentPage(href) {
  const here = location.pathname.replace(/\/index\.html$/, "/");
  const there = href.replace(/\/index\.html$/, "/");
  return here === there;
}

// Build the sidebar for the current project. Wrap the content in a shell so the
// sidebar can sit beside it as a sticky left column.
function injectSidebar() {
  // No project pages (site root, or an unknown project) → leave it chrome-free.
  // The example path matches a project but is a standalone mock, no sidebar.
  if (isExamplePath()) return;
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
  // Inner spans give us a pill hover: the anchor stays full width
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

// Keep the sidebar where you left it across page loads (a persistent
// sidebar). Each page is a fresh document, so cross-document view transitions
// otherwise render the new sidebar at the top and scroll the active item out of
// view. sessionStorage keeps the offset per tab, keyed by project so separate
// sidebars don't clobber each other. Restore runs synchronously here, app.js is
// deferred and the sidebar was just appended, so it applies before first paint,
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
    // while the drawer is open, and focus moves into it. No scroll-lock,
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
  // Crossing to desktop turns the drawer into a static column, force it closed
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

// A hidden probe lets the browser resolve any token, color-mix, relative
// rgb(from …), var() chains, down to a concrete sRGB value we can serialise.
// So swatches copy a clean, paste-ready hex (#6C2BF5) instead of the authored
// expression, always in sync with the tokens because it's read live, never
// stored. See-through tokens copy as 8-digit hex (#404040B3).
//
// A hidden probe resolves the token (color-mix, relative rgb(from …), var()
// chains) to a computed color, which we then rasterise on a 1×1 canvas to get
// concrete 8-bit sRGB channels. The canvas step matters: browsers serialise a
// resolved color-mix as oklab()/color(srgb …), not rgb(), so string-parsing
// alone would miss every mixed hover/active token, rasterising normalises them
// all to bytes.
let colorProbe, colorCtx;
function tokenToHex(token) {
  if (!colorProbe) {
    colorProbe = document.createElement("span");
    colorProbe.style.cssText = "position:absolute;width:0;height:0;visibility:hidden";
    document.body.appendChild(colorProbe);
    colorCtx = document.createElement("canvas").getContext("2d");
  }
  colorProbe.style.color = "";
  colorProbe.style.color = `var(--${token})`;
  const resolved = getComputedStyle(colorProbe).color;
  if (!resolved) return null;

  // Split the resolved color into an opaque form + its alpha. We only ever
  // rasterise the OPAQUE form: an opaque pixel round-trips through canvas
  // exactly, whereas a transparent one is stored premultiplied and drifts ±1.
  // The alpha comes straight from the string, so both stay exact.
  let alpha = 1;
  let opaque = resolved;
  const modern = resolved.match(/\/\s*([\d.]+%?)\s*\)$/); // "oklab(… / 0.7)" etc.
  const legacy = resolved.match(/^rgba?\(([^)]+)\)$/); // "rgba(40, 40, 40, 0.7)"
  if (modern) {
    alpha = modern[1].endsWith("%") ? parseFloat(modern[1]) / 100 : parseFloat(modern[1]);
    opaque = resolved.replace(/\/\s*[\d.]+%?\s*\)$/, ")");
  } else if (legacy) {
    const n = legacy[1].split(",").map((s) => s.trim());
    if (n.length === 4) {
      alpha = parseFloat(n[3]);
      opaque = `rgb(${n[0]}, ${n[1]}, ${n[2]})`;
    }
  }

  colorCtx.clearRect(0, 0, 1, 1);
  colorCtx.fillStyle = opaque;
  colorCtx.fillRect(0, 0, 1, 1);
  const [r, g, b] = colorCtx.getImageData(0, 0, 1, 1).data; // exact, pixel is opaque
  const h = (n) => n.toString(16).padStart(2, "0");
  let hex = `#${h(r)}${h(g)}${h(b)}`;
  if (alpha < 1) hex += h(Math.round(alpha * 255)); // 8-digit only when transparent
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
  });
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

// Show/hide the grid overlay and keep any [data-grid-toggle] control in sync.
// Pass a boolean to set explicitly, or omit to flip the current state.
function setGridOverlay(show) {
  const overlay = document.querySelector("[data-grid-overlay]");
  if (!overlay) return;
  const next = typeof show === "boolean" ? show : overlay.hidden;
  overlay.hidden = !next;
  overlay.setAttribute("aria-hidden", String(!next));
  document.querySelectorAll("[data-grid-toggle]").forEach((btn) => {
    btn.setAttribute("aria-checked", String(next));
  });
}

// Footer link columns are <details>. On mobile they behave as accordions with
// the first open; at md they're forced open (CSS hides the chevron and makes the
// summary inert) so they read as static columns. Driving `open` from JS keeps it
// robust across engines without relying on the ::details-content pseudo.
//
// Only reconcile when the breakpoint actually crosses: mobile browsers fire
// `resize` on every scroll (the toolbar shows/hides), and re-forcing open state
// each time would slam the user's open column shut and re-open the first one.
let footerWide;
function syncFooterColumns() {
  const cols = document.querySelectorAll(".ex-footer__col");
  if (!cols.length) return;
  const wide = window.matchMedia("(min-width: 768px)").matches;
  if (wide === footerWide) return;
  footerWide = wide;
  cols.forEach((col, i) => {
    // Mobile: a shared name makes them an exclusive accordion (one open at a
    // time), natively. Desktop drops the name so every column can stay open.
    if (wide) col.removeAttribute("name");
    else col.setAttribute("name", "ex-footer-nav");
    col.open = wide ? true : i === 0;
    // Desktop columns are static labels, not controls, drop the summary from
    // the tab order (it's already pointer-events:none in CSS).
    const head = col.querySelector("summary");
    if (head) {
      if (wide) head.setAttribute("tabindex", "-1");
      else head.removeAttribute("tabindex");
    }
  });
}

function refreshResponsive() {
  hydrateType();
  // Layout-page grid tokens (--grid-columns etc.) change with viewport, so re-hydrate.
  hydratePreviews();
  buildGridOverlay();
  syncFooterColumns();
}

/* ── Init ──────────────────────────────────────────────────────────────── */

// Token-driven demos, space bars, radius/shadow chips. Grouped so a theme
// switch or viewport change can re-run them (shadow values are theme-dependent).
function hydratePreviews() {
  hydratePreview(".token-list__row", ".token-list__value", (el, value) => {
    const bar = el.querySelector("[data-space-bar]");
    if (bar) bar.style.width = value;
    delete el.dataset.copy;
  });
  hydratePreview(".preview-card", ".preview-card__value", (el, value) => {
    const shadow = el.querySelector("[data-shadow-demo]");
    // Append --surface-rim so the chip matches a real elevated surface, a
    // no-op in light, the top-edge highlight in dark.
    if (shadow) shadow.style.boxShadow = `${value}, var(--surface-rim)`;
    const radius = el.querySelector("[data-radius-demo]");
    if (radius) radius.style.borderRadius = value;
    delete el.dataset.copy;
  });
}

// Grid breakpoint tabs, swap the values shown without needing a viewport
// resize. Values mirror the media queries in demo/tokens.css.
const GRID_BREAKPOINTS = {
  mobile: {
    name: "Base",
    threshold: "< 768px",
    "grid-columns": "4",
    "grid-gutter": "16px",
    "grid-margin": "16px",
    "container-max": "1280px"
  },
  tablet: {
    name: "<code>breakpoint-md</code>",
    threshold: "≥ 768px",
    "grid-columns": "12",
    "grid-gutter": "20px",
    "grid-margin": "24px",
    "container-max": "1280px"
  },
  desktop: {
    name: "<code>breakpoint-lg</code>",
    threshold: "≥ 1024px",
    "grid-columns": "12",
    "grid-gutter": "20px",
    "grid-margin": "32px",
    "container-max": "1280px"
  }
};

// Roving-tabindex keyboard model for a role="tablist" of role="tab" buttons
// (WAI-ARIA tabs pattern): Left/Right + Home/End move selection AND focus, and
// only the selected tab is tabbable. onSelect(tab) reveals the matching panel.
// Returns activate() so callers can set the initial tab without stealing focus.
function wireTablist(tabs, onSelect) {
  const activate = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    if (focus) tab.focus();
    onSelect(tab);
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => activate(tab, false));
    tab.addEventListener("keydown", (e) => {
      const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      let next;
      if (step) next = tabs[(i + step + tabs.length) % tabs.length];
      else if (e.key === "Home") next = tabs[0];
      else if (e.key === "End") next = tabs[tabs.length - 1];
      else return;
      e.preventDefault();
      activate(next, true);
    });
  });
  return activate;
}

function initGridTabs() {
  const tabList = document.querySelector("[data-grid-tabs]");
  const panel = document.querySelector("[data-grid-panel]");
  if (!tabList || !panel) return;
  const tabs = [...tabList.querySelectorAll(".docs-tabs__tab")];
  // Every tab drives the single breakpoint panel; wire the tab/panel pairing.
  const panelId = panel.id || (panel.id = "grid-tab-panel");
  panel.setAttribute("role", "tabpanel");
  tabs.forEach((t, i) => {
    if (!t.id) t.id = `${panelId}-tab-${i}`;
    t.setAttribute("aria-controls", panelId);
  });
  const setActive = (tab) => {
    const values = GRID_BREAKPOINTS[tab.dataset.tab];
    if (!values) return;
    panel.setAttribute("aria-labelledby", tab.id);
    panel.querySelectorAll("[data-grid-key]").forEach((el) => {
      const v = values[el.dataset.gridKey] || "";
      if (el.dataset.gridKey === "name") el.innerHTML = v;
      else el.textContent = v;
    });
  };
  const activate = wireTablist(tabs, setActive);
  // Default to the first tab so entering the page always starts here.
  const first = tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0];
  if (first) activate(first, false);
}

// Tabler arrow-right at 16px, stroke 2, matches ARROW_LEFT_ICON.
const ARROW_RIGHT_16 =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l14 0"/><path d="M13 18l6 -6"/><path d="M13 6l6 6"/></svg>';

// Inject a prev/next pair at the bottom of each doc page.
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

// Code blocks longer than this many lines start collapsed behind a "View Code"
// fade; anything 4 lines or shorter is shown in full with no toggle.
const CODE_COLLAPSE_MIN_LINES = 4;

// Strip the shared leading indentation from a slice so it reads as standalone
// source, then trim surrounding blank lines.
function dedent(text) {
  const lines = text.split("\n");
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines
    .map((l) => l.slice(min))
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
}

// A component's CSS is the run between its "── Name ──" banner in components.css
// and the next banner, no per-component markers needed.
function extractSection(text, name) {
  const lines = text.split("\n");
  const isBanner = (l) => l.includes("── ") && l.includes(" ─");
  const start = lines.findIndex((l) => isBanner(l) && l.includes(`── ${name} ─`));
  if (start === -1) return "";
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (isBanner(lines[i])) {
      end = i;
      break;
    }
  }
  return dedent(lines.slice(start + 1, end).join("\n"));
}

// A component's behaviour is a top-level init function in app.js: from its
// declaration to the closing brace sitting in column 0.
function extractFunction(text, name) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`function ${name}(`));
  if (start === -1) return "";
  let end = start;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i] === "}") {
      end = i;
      break;
    }
  }
  return dedent(lines.slice(start, end + 1).join("\n"));
}

// Minimal syntax highlighter for the auto-extracted slices. Walks the source
// with sticky regexes and wraps matches in the same tok-* spans the hand-written
// Markup blocks use. Input is our own source, and every matched slice is escaped
// before it becomes markup, so innerHTML is safe here.
const HL_ESCAPE = (s) =>
  s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

const HL_RULES = {
  js: [
    ["tok-com", /\/\/[^\n]*|\/\*[\s\S]*?\*\//y],
    ["tok-str", /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/y],
    [
      "tok-key",
      /\b(?:async|await|break|case|catch|class|const|continue|default|delete|do|else|export|extends|false|finally|for|from|function|if|import|in|instanceof|let|new|null|of|return|switch|this|throw|true|try|typeof|undefined|var|void|while|yield)\b/y
    ],
    ["tok-var", /\b\d+(?:\.\d+)?\b/y],
    ["tok-fn", /[A-Za-z_$][\w$]*(?=\s*\()/y]
  ],
  css: [
    ["tok-com", /\/\*[\s\S]*?\*\//y],
    ["tok-str", /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/y],
    ["tok-key", /@[\w-]+/y],
    ["tok-selector", /[.#][\w-]+|&|::?[A-Za-z-][\w-]*|\[[^\]]*\]/y],
    ["tok-var", /--[\w-]+/y],
    ["tok-fn", /[A-Za-z-]+(?=\()/y],
    ["tok-prop", /[A-Za-z-]+(?=\s*:)/y]
  ],
  html: [
    ["tok-com", /<!--[\s\S]*?-->/y],
    ["tok-str", /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/y],
    ["tok-key", /<\/?[a-zA-Z][\w-]*|\/?>/y],
    ["tok-prop", /[a-zA-Z-]+(?==)/y]
  ],
  jsx: [
    ["tok-com", /\/\/[^\n]*|\/\*[\s\S]*?\*\//y],
    ["tok-str", /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/y],
    [
      "tok-key",
      /\b(?:async|await|break|case|catch|class|const|continue|default|delete|do|else|export|extends|false|finally|for|from|function|if|import|in|instanceof|let|new|null|of|return|switch|this|throw|true|try|typeof|undefined|var|void|while|yield)\b/y
    ],
    ["tok-key", /<\/?[A-Za-z][\w.]*|\/?>/y],
    ["tok-prop", /[A-Za-z-]+(?==)/y],
    ["tok-var", /\b\d+(?:\.\d+)?\b/y],
    ["tok-fn", /[A-Za-z_$][\w$]*(?=\s*\()/y]
  ]
};

function highlight(code, lang) {
  const rules = HL_RULES[lang] || [];
  let out = "";
  let i = 0;
  while (i < code.length) {
    let hit = false;
    for (const [cls, re] of rules) {
      re.lastIndex = i;
      const m = re.exec(code);
      if (m && m[0]) {
        out += `<span class="${cls}">${HL_ESCAPE(m[0])}</span>`;
        i += m[0].length;
        hit = true;
        break;
      }
    }
    if (!hit) {
      out += HL_ESCAPE(code[i]);
      i++;
    }
  }
  return out;
}

// Fill every [data-source] holder with a live slice of the real source file, so
// each component page shows the exact CSS / JS it needs with zero drift. Slices
// reuse the collapsible code panel via injectCodeCopy().
async function hydrateSource() {
  const holders = document.querySelectorAll("[data-source]");
  if (!holders.length) return;
  const cache = new Map();
  const load = (src) => {
    if (!cache.has(src))
      cache.set(
        src,
        fetch(src).then((r) => r.text())
      );
    return cache.get(src);
  };
  await Promise.all(
    [...holders].map(async (holder) => {
      try {
        const text = await load(holder.dataset.source);
        const slice = holder.dataset.section
          ? extractSection(text, holder.dataset.section)
          : holder.dataset.fn
            ? extractFunction(text, holder.dataset.fn)
            : dedent(text); // whole file (e.g. a React component)
        if (!slice) return;
        const src = holder.dataset.source;
        const lang = src.endsWith(".css") ? "css" : src.endsWith(".jsx") ? "jsx" : "js";
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.innerHTML = highlight(slice, lang);
        pre.appendChild(code);
        holder.appendChild(pre);
      } catch {
        /* offline / file moved, leave the holder empty */
      }
    })
  );
  injectCodeCopy();
}

// Attribute names React spells differently from HTML. Anything not listed
// (aria-*, data-*, viewBox, fill, stroke, d, …) is already valid JSX as-is.
const JSX_ATTRS = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "fill-rule": "fillRule",
  "clip-rule": "clipRule"
};

// Derive a JSX snippet from extracted HTML for passthrough components (no props):
// rename those attributes. The all-lowercase [a-z-]+ match leaves camelCase
// attrs (viewBox) and boolean attrs untouched. Icon-heavy examples still want a
// hand-written script (Tabler components, not raw inline SVG).
function htmlToJsx(html) {
  return html.replace(/(\s)([a-z-]+)=/g, (_, sp, name) => sp + (JSX_ATTRS[name] || name) + "=");
}

// Per-example code: each [data-example] wraps a live preview and
// a <script class="example__react"> holding its JSX. The HTML version is read
// straight from the preview's own markup (no drift). A page-level
// [data-code-tabs] toggles which language every example shows.
function initExamples() {
  const tablist = document.querySelector("[data-code-tabs]");
  const examples = [...document.querySelectorAll("[data-example]")];
  if (!tablist || !examples.length) return;

  examples.forEach((ex, i) => {
    const preview = ex.querySelector(".component-preview");
    const reactEl = ex.querySelector(".example__react");
    const html = preview ? dedent(preview.innerHTML).trim() : "";
    ex._code = {
      html,
      // Prop-rich components ship a hand-written <script class="example__react">;
      // passthrough components (just classes) derive their JSX from the HTML.
      react: reactEl ? dedent(reactEl.textContent).trim() : htmlToJsx(html)
    };
    reactEl?.remove();
    const holder = document.createElement("div");
    holder.className = "example__code";
    holder.id = `example-code-${i}`;
    holder.setAttribute("role", "tabpanel");
    ex.appendChild(holder);
  });

  const render = (lang) => {
    examples.forEach((ex) => {
      const holder = ex.querySelector(".example__code");
      holder.textContent = "";
      const code = ex._code[lang];
      if (!code) {
        holder.hidden = true;
        return;
      }
      holder.hidden = false;
      const pre = document.createElement("pre");
      const codeEl = document.createElement("code");
      codeEl.innerHTML = highlight(code, lang === "html" ? "html" : "jsx");
      pre.appendChild(codeEl);
      holder.appendChild(pre);
    });
    // Whole sections tagged [data-lang] (e.g. the bottom Component reference)
    // follow the same tab.
    document.querySelectorAll("[data-lang]").forEach((el) => {
      el.hidden = el.dataset.lang !== lang;
    });
    injectCodeCopy();
  };

  const tabs = [...tablist.querySelectorAll("[data-code-lang]")];
  // The per-example code holders are the tabpanels; every language tab controls
  // the whole set (content swaps in place), each labelled by the selected tab.
  const holders = examples.map((ex) => ex.querySelector(".example__code"));
  const panelIds = holders.map((h) => h.id).join(" ");
  tabs.forEach((tab, i) => {
    if (!tab.id) tab.id = `code-tab-${i}`;
    tab.setAttribute("aria-controls", panelIds);
  });
  const activate = wireTablist(tabs, (tab) => {
    render(tab.dataset.codeLang);
    holders.forEach((h) => h.setAttribute("aria-labelledby", tab.id));
  });
  const active = tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0];
  activate(active, false);
}

// Split already-highlighted code HTML into per-line <span class="line"> wrappers,
// re-balancing any highlight span that crosses a line break (e.g. a multi-line
// comment). Lines are rejoined with "\n" so the copied text is unchanged; the
// numbers come from a CSS counter, so they're never part of the DOM text.
function wrapLines(html) {
  const open = [];
  const lines = [[]];
  const cur = () => lines[lines.length - 1];
  let i = 0;
  while (i < html.length) {
    if (html[i] === "<") {
      const end = html.indexOf(">", i);
      const tag = html.slice(i, end + 1);
      if (tag.startsWith("</")) open.pop();
      else open.push(tag);
      cur().push(tag);
      i = end + 1;
    } else {
      let j = i;
      while (j < html.length && html[j] !== "<" && html[j] !== "\n") j += 1;
      if (j > i) cur().push(html.slice(i, j));
      if (html[j] === "\n") {
        open.forEach(() => cur().push("</span>"));
        lines.push([]);
        open.forEach((t) => cur().push(t));
        i = j + 1;
      } else {
        i = j;
      }
    }
  }
  return lines.map((f) => `<span class="line">${f.join("")}</span>`).join("\n");
}

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

    // Line numbers via a per-line ::before counter (Shiki-style): wrap each line
    // in <span class="line"> so a future line-highlight background can bleed
    // full-width behind the number. Lines stay joined by newlines, so copy is
    // unchanged and the numbers (CSS-generated) never enter the selection.
    code.innerHTML = wrapLines(code.innerHTML);
    wrapper.classList.add("code-block--numbered");

    // Collapse only the per-example snippets. Standalone reference blocks (the
    // bottom Component, CSS, Markup) show in full, no expand.
    if (!pre.closest(".example__code")) return;
    // Counting .line works even while the block is hidden (a tab away), unlike
    // measuring height.
    if (code.querySelectorAll(".line").length <= CODE_COLLAPSE_MIN_LINES) return;
    wrapper.classList.add("code-block--collapsible", "is-collapsed");
    // Non-interactive fade container; only the pill button inside is clickable.
    const toggle = document.createElement("div");
    toggle.className = "code-block__toggle";
    const btn2 = document.createElement("button");
    btn2.type = "button";
    btn2.className = "code-block__toggle-pill btn btn--outline";
    btn2.textContent = "View Code";
    // One-way: open into the scroll box and drop the fade + pill. Keep
    // the collapsible class so the opened max-height + scroll still apply.
    btn2.addEventListener("click", () => {
      wrapper.classList.remove("is-collapsed");
      toggle.remove();
    });
    toggle.appendChild(btn2);
    wrapper.appendChild(toggle);
  });
}

// Shared overlay scroll behavior for trigger-anchored surfaces (menu, select,
// popover). Desktop: lock the page while open, the pointer stays over the
// surface so page-scroll isn't the intent. Touch: dismiss on a scroll that
// starts outside the surface, which is exactly how a touch scroll begins.
// Call onOpen()/onClose() from the component's own open/close.
const overlayIsDesktop = window.matchMedia("(hover: hover) and (pointer: fine)");
function overlayScroll(surface, close) {
  let onScroll = null;
  return {
    onOpen() {
      if (overlayIsDesktop.matches) {
        lockBodyScroll();
        return;
      }
      // Ignore scrolls originating inside the surface itself (long lists).
      onScroll = (ev) => {
        if (!surface.contains(ev.target)) close();
      };
      window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    },
    onClose() {
      unlockBodyScroll();
      if (!onScroll) return;
      window.removeEventListener("scroll", onScroll, true);
      onScroll = null;
    }
  };
}

// Coalesce rapid scroll/resize events into one reposition per animation frame,
// so following the trigger stays smooth on touch instead of thrashing layout.
function rafThrottle(fn) {
  let raf = 0;
  return () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      fn();
    });
  };
}

// Flip a select/combobox list above its trigger when it won't fit below and
// there's more room above. The CSS-native version is anchor positioning, but
// that lacks Safari support today, so this mirrors positionPopover's JS flip.
// Call on open, once the list is visible so its height can be measured. Measures
// against the visual viewport (keyboard-aware): opens below, flips above only when
// below can't fit and above has more room, and caps the height to the space
// available so it clips instead of hiding behind the keyboard.
// fixed=true positions in viewport coords for a position:fixed list that stays in
// the DOM (Combobox, so VoiceOver can follow aria-activedescendant into it); the
// default adds scroll offsets for a position:absolute list portaled to <body>
// (Select). getBoundingClientRect is viewport-relative either way.
function positionFloating(anchor, list, wasAbove, fixed = false) {
  const GAP = 4;
  const PAD = 8;
  const MIN = 88; // clip a side down to this before flipping to the other
  const sx = fixed ? 0 : window.scrollX;
  const sy = fixed ? 0 : window.scrollY;
  // getBoundingClientRect is relative to the visual viewport, so cap against the
  // visual viewport height directly (the area above the keyboard) — no offset.
  const vv = window.visualViewport;
  const viewBottom = vv ? vv.height : window.innerHeight;
  const rect = anchor.getBoundingClientRect();
  list.style.width = `${rect.width}px`;
  // Clamp horizontally so a list near the right edge (or wider than the space to
  // its right) doesn't run off-screen — same guard positionPopover/tooltip use.
  const viewRight = (vv ? vv.width : window.innerWidth) - PAD;
  const left = Math.max(PAD, Math.min(rect.left, viewRight - rect.width));
  list.style.left = `${left + sx}px`;
  list.style.maxHeight = "";
  const natural = list.offsetHeight;
  const roomBelow = viewBottom - rect.bottom - GAP - PAD;
  const roomAbove = rect.top - GAP - PAD;
  // Hysteresis so it behaves the same both ways: prefer below on open, then stay
  // on the current side and clip it down to MIN before flipping — never flip back
  // just because the other side grew.
  let above;
  if (wasAbove === undefined) above = roomBelow < Math.min(natural, MIN) && roomAbove > roomBelow;
  else if (wasAbove) above = !(roomAbove < MIN && roomBelow > roomAbove);
  else above = roomBelow < MIN && roomAbove > roomBelow;
  if (above) {
    const h = Math.min(natural, Math.max(0, roomAbove));
    list.style.top = `${rect.top + sy - h - GAP}px`;
    if (natural > roomAbove) list.style.maxHeight = `${Math.max(0, roomAbove)}px`;
  } else {
    list.style.top = `${rect.bottom + sy + GAP}px`;
    if (natural > roomBelow) list.style.maxHeight = `${Math.max(0, roomBelow)}px`;
  }
  return above;
}

// Keep a list placed against its anchor on scroll/resize and visual-viewport
// changes (mobile keyboard). Never closes on those, just re-places, like shadcn.
// Default: portal to <body>, position:absolute in page coords (Select). fixed:
// leave the list in the DOM and float it with position:fixed (Combobox), so a
// screen reader can follow aria-activedescendant into it — a body portal breaks
// that for a control that keeps focus in the input.
function floatingList(anchor, list, { fixed = false } = {}) {
  let above;
  const place = () => {
    above = positionFloating(anchor, list, above, fixed);
  };
  const reflow = rafThrottle(place);
  // Capturing scroll catches page/ancestor scrolls to keep the list glued, but it
  // also catches the list's OWN internal scroll (scrollIntoView keeping the active
  // row visible). Re-placing on that rewrites the list's inline styles on every
  // arrow key, which makes VoiceOver re-read and drop the option name — so ignore
  // scrolls that originate inside the list.
  const onScroll = (e) => {
    const t = e.target;
    if (t instanceof Node && list.contains(t)) return; // the list's own scroll
    reflow();
  };
  const vv = window.visualViewport;
  return {
    reflow,
    open() {
      above = undefined;
      if (fixed) list.style.position = "fixed";
      else document.body.appendChild(list);
      place();
      window.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", reflow);
      vv?.addEventListener("resize", reflow);
      vv?.addEventListener("scroll", reflow);
    },
    close() {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", reflow);
      vv?.removeEventListener("resize", reflow);
      vv?.removeEventListener("scroll", reflow);
    }
  };
}

// Custom select: a styled trigger + a floating listbox. Native <select> is the
// default; this is for when option rendering needs to be custom. Handles
// open/close, click + keyboard selection (arrows/Enter/Esc), and click-away.
function initSelects() {
  document.querySelectorAll("[data-select]").forEach((root, si) => {
    const trigger = root.querySelector(".select__trigger");
    const list = root.querySelector(".select__list");
    const valueEl = root.querySelector(".select__value");
    const options = [...root.querySelectorAll(".select__option")];
    if (!trigger || !list || !options.length) return;

    let activeIndex = options.findIndex((o) => o.getAttribute("aria-selected") === "true");
    // Unique per instance (si), or duplicate ids collide across selects and the
    // aria-controls/activedescendant refs resolve to the wrong list.
    const base = root.id || `select-${si}`;
    options.forEach((o, i) => {
      if (!o.id) o.id = `${base}-opt-${i}`;
    });
    if (!list.id) list.id = `${base}-list`;
    trigger.setAttribute("aria-controls", list.id);
    // Labels are static, lowercase them once for type-ahead instead of per key.
    const optionLabels = options.map((o) => o.textContent.trim().toLowerCase());

    // The open list takes DOM focus (see open()); the active option is tracked
    // with .is-active + aria-activedescendant ON THE LIST. Keeping the ref on the
    // list (not the trigger) means the pointer and its target stay in one subtree,
    // so VoiceOver still follows it once the list is portaled to <body> — an
    // activedescendant ref reaching across the portal from the trigger isn't.
    // scroll=false for pointer moves: only keyboard nav should tug the scroll.
    const setActive = (i, scroll = true) => {
      activeIndex = (i + options.length) % options.length;
      const opt = options[activeIndex];
      options.forEach((o, idx) => o.classList.toggle("is-active", idx === activeIndex));
      if (scroll) opt.scrollIntoView({ block: "nearest" });
      list.setAttribute("aria-activedescendant", opt.id);
    };
    const floating = floatingList(root, list);
    const open = () => {
      if (!list.hidden) return;
      list.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      floating.open();
      setActive(activeIndex < 0 ? 0 : activeIndex);
      list.focus(); // move focus into the list so the active option is spoken
    };
    // refocus=true hands focus back to the trigger (keyboard close / selection);
    // a click-away or a blur elsewhere closes with focus already gone, so false.
    const close = (refocus = true) => {
      if (list.hidden) return;
      list.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      list.removeAttribute("aria-activedescendant");
      floating.close();
      if (refocus) trigger.focus();
    };
    const select = (i) => {
      options.forEach((o, idx) => o.setAttribute("aria-selected", String(idx === i)));
      // Rich options (e.g. a flag + label) mirror their markup into the trigger;
      // text-only options stay plain text.
      if (valueEl) {
        if (options[i].querySelector("*")) valueEl.innerHTML = options[i].innerHTML;
        else valueEl.textContent = options[i].textContent.trim();
      }
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

    // Trigger just opens/toggles; once open, focus is in the list and the list's
    // own keydown drives navigation. Enter/Space open via the native button click.
    // Focus alone doesn't open (unlike Combobox, which is input-first).
    trigger.addEventListener("click", () => (list.hidden ? open() : close()));
    trigger.addEventListener("keydown", (e) => {
      if (!list.hidden) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        open();
      } else if (e.key.length === 1 && e.key !== " " && !e.ctrlKey && !e.metaKey && !e.altKey) {
        open();
        matchTypeahead(e.key);
      }
    });

    // Navigation runs on the list, which holds focus while open.
    const keyActions = {
      ArrowDown: () => setActive(activeIndex + 1),
      ArrowUp: () => setActive(activeIndex - 1),
      Home: () => setActive(0),
      End: () => setActive(options.length - 1),
      Enter: () => select(activeIndex),
      " ": () => select(activeIndex)
    };
    list.addEventListener("keydown", (e) => {
      if (e.key === "Escape" || e.key === "Tab") {
        e.preventDefault();
        close(); // back to the trigger; a second Tab then leaves normally
        return;
      }
      if (e.key in keyActions) {
        e.preventDefault();
        keyActions[e.key]();
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) matchTypeahead(e.key);
    });
    // Wheel-scrolling slides rows under a still pointer, firing a synthetic
    // mousemove (same clientX/Y). Ignore those so the highlight follows only a
    // real move, and never scroll from the pointer.
    let lastPointer = null;
    options.forEach((o, i) => {
      // Keep focus on the list (not the option) so it doesn't fall to <body>.
      o.addEventListener("mousedown", (e) => e.preventDefault());
      o.addEventListener("click", () => select(i));
      o.addEventListener("mousemove", (e) => {
        if (lastPointer && e.clientX === lastPointer.x && e.clientY === lastPointer.y) return;
        lastPointer = { x: e.clientX, y: e.clientY };
        setActive(i, false);
      });
    });
    // The list is portaled to <body>, so "outside" must exclude it too. Closing
    // from here leaves focus where the user put it (refocus=false).
    document.addEventListener("click", (e) => {
      if (!root.contains(e.target) && !list.contains(e.target)) close(false);
    });
    list.addEventListener("focusout", (e) => {
      const to = e.relatedTarget;
      if (!to || (!root.contains(to) && !list.contains(to))) close(false);
    });
  });
}

// Combobox: a text field that filters a listbox. Reuses the Select popup markup
// (.select__list/.select__option) but the keyboard model is input-first, typing
// filters, Arrow keys walk only the visible rows, Enter picks the active one.
// aria-activedescendant tracks the active row while focus stays in the input.
function initComboboxes() {
  document.querySelectorAll("[data-combobox]").forEach((root) => {
    const input = root.querySelector('[role="combobox"]');
    const list = root.querySelector('[role="listbox"]');
    const options = [...root.querySelectorAll(".select__option")];
    const empty = root.querySelector(".combobox__empty");
    if (!input || !list || !options.length) return;

    // Polite live region so an empty result set is announced; the visible
    // ".combobox__empty" row is presentational and never reaches a screen reader.
    const status = document.createElement("div");
    status.className = "sr-only";
    status.setAttribute("role", "status");
    root.appendChild(status);

    options.forEach((o, i) => {
      if (!o.id) o.id = `${root.id || list.id || "combobox"}-opt-${i}`;
      // Every listbox option must expose a selected state; without it VoiceOver
      // can announce the active row inconsistently.
      if (!o.hasAttribute("aria-selected")) o.setAttribute("aria-selected", "false");
    });
    // Labels are static, cache them for filtering instead of reading the DOM.
    const labels = options.map((o) => o.textContent.trim());
    let activeIndex = -1;

    const visible = () => options.filter((o) => !o.hidden);

    // scroll=false for pointer moves: only keyboard nav should tug the scroll.
    const setActive = (opt, scroll = true) => {
      activeIndex = opt ? options.indexOf(opt) : -1;
      options.forEach((o) => o.classList.toggle("is-active", o === opt));
      if (opt) {
        if (scroll) opt.scrollIntoView({ block: "nearest" });
        input.setAttribute("aria-activedescendant", opt.id);
      } else {
        input.removeAttribute("aria-activedescendant");
      }
    };
    const floating = floatingList(root, list, { fixed: true });
    const open = () => {
      if (!list.hidden) return;
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
      floating.open();
      // On touch, lift the field toward the top so the list has room to open
      // below it above the keyboard (the reflow listeners keep it glued).
      if (!overlayIsDesktop.matches) {
        requestAnimationFrame(() => root.scrollIntoView({ block: "start", behavior: "smooth" }));
      }
    };
    const close = () => {
      if (list.hidden) return;
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      setActive(null);
      floating.close();
    };

    // Substring filter (empty query shows everything); active row resets to the
    // first match, and the "no results" row shows when nothing matches.
    const filter = () => {
      const q = input.value.trim().toLowerCase();
      options.forEach((o, i) => {
        o.hidden = q !== "" && !labels[i].toLowerCase().includes(q);
      });
      const vis = visible();
      if (empty) empty.hidden = vis.length > 0;
      status.textContent = vis.length === 0 ? "No results" : "";
      // No row is pre-highlighted (matches shadcn): Enter on a fresh open closes
      // without picking; arrow keys move into the list.
      setActive(null);
      // Filtering changes the list height, so re-place it while open.
      if (!list.hidden) floating.reflow();
    };
    const choose = (opt) => {
      if (!opt) return;
      input.value = opt.textContent.trim();
      options.forEach((o) => o.setAttribute("aria-selected", String(o === opt)));
      close();
    };

    input.addEventListener("input", () => {
      open();
      filter();
    });
    input.addEventListener("focus", () => {
      if (input.matches(":focus-visible")) {
        open();
        filter();
      }
    });
    input.addEventListener("click", () => {
      if (list.hidden) {
        open();
        filter();
      }
    });

    // Clicking the chevron toggles the list too (like shadcn); keep focus in the
    // input so typing still filters.
    const chevron = root.querySelector(".combobox__chevron");
    if (chevron) {
      chevron.addEventListener("mousedown", (e) => e.preventDefault());
      chevron.addEventListener("click", () => {
        if (list.hidden) {
          input.focus();
          open();
          filter();
        } else {
          close();
        }
      });
    }

    // The whole field is a hit target (like shadcn): clicking its padding — the
    // dead space around the shorter input and by the chevron — focuses the input
    // instead of doing nothing. The input and chevron handle their own clicks.
    const control = root.querySelector(".combobox__control");
    control?.addEventListener("mousedown", (e) => {
      if (e.target === input || chevron?.contains(e.target)) return;
      e.preventDefault();
      input.focus();
      if (list.hidden) {
        open();
        filter();
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape" || e.key === "Tab") {
        close();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (list.hidden) {
          open();
          filter();
          return;
        }
        const vis = visible();
        if (!vis.length) return;
        const cur = vis.indexOf(options[activeIndex]);
        let next;
        if (cur === -1) next = e.key === "ArrowDown" ? 0 : vis.length - 1;
        else
          next =
            e.key === "ArrowDown" ? (cur + 1) % vis.length : (cur - 1 + vis.length) % vis.length;
        setActive(vis[next]);
        return;
      }
      if (e.key === "Enter") {
        if (list.hidden) return;
        e.preventDefault();
        if (activeIndex >= 0 && !options[activeIndex].hidden) choose(options[activeIndex]);
        else close();
        return;
      }
      if ((e.key === "Home" || e.key === "End") && !list.hidden) {
        const vis = visible();
        if (!vis.length) return;
        e.preventDefault();
        setActive(e.key === "Home" ? vis[0] : vis[vis.length - 1]);
      }
    });

    // Wheel-scrolling the list slides rows under a still pointer, which fires a
    // synthetic mousemove (same clientX/Y). Ignore those so the highlight only
    // follows a real move, and never scroll from the pointer.
    let lastPointer = null;
    options.forEach((o) => {
      // Keep focus in the input when picking with the mouse.
      o.addEventListener("mousedown", (e) => e.preventDefault());
      o.addEventListener("click", () => choose(o));
      o.addEventListener("mousemove", (e) => {
        if (lastPointer && e.clientX === lastPointer.x && e.clientY === lastPointer.y) return;
        lastPointer = { x: e.clientX, y: e.clientY };
        setActive(o, false);
      });
    });
    // The list stays inside root (position:fixed, not portaled), so a click or
    // focus anywhere in root already counts as inside; close only on a genuine
    // outside interaction.
    document.addEventListener("click", (e) => {
      if (!root.contains(e.target) && !list.contains(e.target)) close();
    });
    root.addEventListener("focusout", (e) => {
      const to = e.relatedTarget;
      if (to && !root.contains(to) && !list.contains(to)) close();
    });
  });
}

// Calendar: renders a month grid into [data-cal-days] and drives month nav +
// keyboard (arrows = ±1/±7 days, Home/End = week ends, PageUp/Dn = ±month,
// Enter/Space selects). One day carries tabindex 0 (roving), the rest -1. The
// selected date lives in data-cal-value (ISO); with data-cal-target="#el" a pick
// writes a formatted date into that element and closes any enclosing popover,
// that's the date-picker recipe.
function initCalendars() {
  const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const WEEKDAY_LABELS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
  ];
  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];
  document.querySelectorAll("[data-calendar]").forEach((root) => {
    const daysEl = root.querySelector("[data-cal-days]");
    const monthSel = root.querySelector("[data-cal-month]");
    const yearSel = root.querySelector("[data-cal-year]");
    if (!daysEl || !monthSel || !yearSel) return;

    // Days container is the ARIA grid: a columnheader row of weekday names, then
    // one role="row" per week (see render). The weekday header lives inside the
    // grid so screen readers can associate each day cell with its column.
    daysEl.setAttribute("role", "grid");

    // Polite live region: prev/next and the month/year selects swap the grid
    // silently (changing a non-focused grid's aria-label isn't announced), so
    // speak the new "Month Year". Skip the first render so it stays quiet on load.
    const status = document.createElement("div");
    status.className = "sr-only";
    status.setAttribute("role", "status");
    root.appendChild(status);
    let firstRender = true;

    const iso = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
    const same = (a, b) =>
      a &&
      b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Cap at 31 Dec of the current year: no later month, year, or day.
    const maxYear = today.getFullYear();
    const maxDate = new Date(maxYear, 11, 31);
    maxDate.setHours(0, 0, 0, 0);
    // Floor a decade back, mirroring the seeded year range, so paging backward is
    // bounded (matches the dropdown) instead of appending years forever.
    const minYear = maxYear - 10;
    const minDate = new Date(minYear, 0, 1);
    minDate.setHours(0, 0, 0, 0);
    let selected = null;
    const initial = root.getAttribute("data-cal-value");
    if (initial) {
      const d = new Date(`${initial}T00:00:00`);
      if (!Number.isNaN(d.getTime())) selected = d;
    }
    let view = new Date(selected || today);
    view.setDate(1);

    // Month dropdown (3-letter labels) + a year range around the current view.
    if (!monthSel.children.length) {
      MONTHS.forEach((m, i) => {
        const o = document.createElement("option");
        o.value = String(i);
        o.textContent = m;
        monthSel.appendChild(o);
      });
    }
    const ensureYearOption = (y) => {
      if (y > maxYear || y < minYear) return; // stay within the bounded range
      if ([...yearSel.options].some((o) => Number(o.value) === y)) return;
      const o = document.createElement("option");
      o.value = String(y);
      o.textContent = String(y);
      // Insert in ascending order so the dropdown never shows years out of order.
      const after = [...yearSel.options].find((opt) => Number(opt.value) > y);
      yearSel.insertBefore(o, after || null);
    };
    if (!yearSel.children.length) {
      for (let y = maxYear - 10; y <= maxYear; y += 1) ensureYearOption(y);
    }

    function render() {
      monthSel.value = String(view.getMonth());
      ensureYearOption(view.getFullYear());
      yearSel.value = String(view.getFullYear());
      // No month beyond the one holding maxDate, nor before the floor.
      const nextStart = new Date(view.getFullYear(), view.getMonth() + 1, 1);
      if (next) next.disabled = nextStart > maxDate;
      const viewStart = new Date(view.getFullYear(), view.getMonth(), 1);
      if (prev) prev.disabled = viewStart <= minDate;
      const viewLabel = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      daysEl.setAttribute("aria-label", viewLabel);
      if (!firstRender) status.textContent = viewLabel;
      firstRender = false;
      const startDow = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7;
      const start = new Date(view.getFullYear(), view.getMonth(), 1 - startDow);
      daysEl.replaceChildren();
      // Columnheader row (weekday names). Abbreviated on screen; aria-label spells
      // the full name so it reads clearly when a day cell announces its column.
      const headRow = document.createElement("div");
      headRow.className = "calendar__weekdays";
      headRow.setAttribute("role", "row");
      WEEKDAYS.forEach((w, wi) => {
        const s = document.createElement("span");
        s.className = "calendar__weekday";
        s.setAttribute("role", "columnheader");
        s.setAttribute("aria-label", WEEKDAY_LABELS[wi]);
        s.textContent = w;
        headRow.appendChild(s);
      });
      daysEl.appendChild(headRow);
      let row = null;
      for (let i = 0; i < 42; i += 1) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        // Don't render trailing days past the cap, there's no month to reach them
        // in (the cap is always end of December, so this only trims the spill-over).
        if (d > maxDate) break;
        // Open a new week row every 7th cell so each row groups its 7 gridcells.
        if (i % 7 === 0) {
          row = document.createElement("div");
          row.className = "calendar__week";
          row.setAttribute("role", "row");
          daysEl.appendChild(row);
        }
        // Leading days before the floor get an inert spacer instead of a button,
        // so the first in-range day keeps its column (mirrors the trailing cap).
        if (d < minDate) {
          const gap = document.createElement("div");
          gap.className = "calendar__day is-empty";
          gap.setAttribute("aria-hidden", "true");
          row.appendChild(gap);
          continue;
        }
        // Neighbouring-month days show their number but are inert (not a button,
        // not focusable/clickable), so selection stays inside the shown month.
        if (d.getMonth() !== view.getMonth()) {
          const out = document.createElement("div");
          out.className = "calendar__day is-outside";
          out.setAttribute("aria-hidden", "true");
          out.textContent = String(d.getDate());
          row.appendChild(out);
          continue;
        }
        // The gridcell is a wrapper; the focusable day is a plain <button> inside
        // it. VoiceOver then reads the focused button (not the cell), so it
        // announces one day instead of reading into the grid.
        const cell = document.createElement("div");
        cell.className = "calendar__cell";
        cell.setAttribute("role", "gridcell");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "calendar__day";
        btn.textContent = String(d.getDate());
        btn.dataset.date = iso(d);
        btn.setAttribute(
          "aria-label",
          d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
        );
        if (same(d, today)) {
          btn.classList.add("is-today");
          btn.setAttribute("aria-current", "date");
        }
        const isSel = same(d, selected);
        btn.classList.toggle("is-selected", isSel);
        cell.setAttribute("aria-selected", String(isSel)); // selected state on the cell
        btn.tabIndex = isSel ? 0 : -1;
        cell.appendChild(btn);
        row.appendChild(cell);
      }
      // Guarantee one tabbable cell even with nothing selected. Only in-month
      // days are buttons (spacers and outside days are inert divs), so the first
      // one is a safe target.
      if (!daysEl.querySelector('[tabindex="0"]')) {
        const cur = daysEl.querySelector("button.calendar__day");
        if (cur) cur.tabIndex = 0;
      }
    }

    function focusDate(d) {
      if (d > maxDate || d < minDate) return; // stay within the bounded range
      if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) {
        view = new Date(d.getFullYear(), d.getMonth(), 1);
        render();
      }
      const target = daysEl.querySelector(`[data-date="${iso(d)}"]`);
      if (!target) return;
      daysEl.querySelectorAll('[tabindex="0"]').forEach((b) => {
        b.tabIndex = -1;
      });
      target.tabIndex = 0;
      target.focus();
    }

    function select(d) {
      if (d > maxDate) return; // can't pick past the cap
      selected = d;
      root.setAttribute("data-cal-value", iso(d));
      render();
      const targetSel = root.getAttribute("data-cal-target");
      if (targetSel) {
        const el = document.querySelector(targetSel);
        if (el) {
          const label = d.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric"
          });
          if (el.tagName === "INPUT") el.value = label;
          else el.textContent = label;
        }
        const pop = root.closest("[popover]");
        if (pop && pop.hidePopover) pop.hidePopover();
      }
    }

    const step = (months) => {
      view = new Date(view.getFullYear(), view.getMonth() + months, 1);
      render();
    };
    const prev = root.querySelector("[data-cal-prev]");
    const next = root.querySelector("[data-cal-next]");
    if (prev) prev.addEventListener("click", () => step(-1));
    if (next) next.addEventListener("click", () => step(1));

    monthSel.addEventListener("change", () => {
      view = new Date(view.getFullYear(), Number(monthSel.value), 1);
      render();
    });
    yearSel.addEventListener("change", () => {
      view = new Date(Number(yearSel.value), view.getMonth(), 1);
      render();
    });

    daysEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".calendar__day");
      if (btn && btn.dataset.date) select(new Date(`${btn.dataset.date}T00:00:00`));
    });

    daysEl.addEventListener("keydown", (e) => {
      const btn = e.target.closest(".calendar__day");
      if (!btn || !btn.dataset.date) return;
      const cur = new Date(`${btn.dataset.date}T00:00:00`);
      const dow = (cur.getDay() + 6) % 7;
      const dayMoves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      if (e.key in dayMoves) {
        e.preventDefault();
        const n = new Date(cur);
        n.setDate(cur.getDate() + dayMoves[e.key]);
        focusDate(n);
      } else if (e.key === "Home") {
        e.preventDefault();
        const n = new Date(cur);
        n.setDate(cur.getDate() - dow);
        focusDate(n);
      } else if (e.key === "End") {
        e.preventDefault();
        const n = new Date(cur);
        n.setDate(cur.getDate() + (6 - dow));
        focusDate(n);
      } else if (e.key === "PageUp" || e.key === "PageDown") {
        e.preventDefault();
        focusDate(
          new Date(cur.getFullYear(), cur.getMonth() + (e.key === "PageUp" ? -1 : 1), cur.getDate())
        );
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        select(cur);
      }
    });

    render();
  });
}

// Place a popover under its invoker: below by default, flipped up when cramped,
// and clamped to the viewport so it never runs off-screen. Primary placement for
// popovers; the dropdown menu uses CSS anchor positioning and only falls back
// here where that's unsupported.
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

// The dropdown menu keeps CSS anchor positioning (initMenus owns its keyboard
// model); every other popover is positioned by JS so it clamps to the viewport
// on any browser (CSS anchor positioning's flip/clamp fallbacks aren't reliable
// yet). On desktop it follows the trigger on scroll; on touch it dismisses on
// scroll instead (like Select), so it doesn't ride along on a phone.
function initPopovers() {
  const supportsAnchor = CSS.supports("position-area", "bottom");
  document.querySelectorAll(".popover[id]").forEach((pop) => {
    const trigger = document.querySelector(`[popovertarget="${pop.id}"]`);
    if (!trigger) return;

    if (pop.classList.contains("menu__list")) {
      // JS only fills in where anchor positioning is unsupported.
      if (!supportsAnchor) {
        pop.addEventListener("toggle", (e) => {
          if (e.newState === "open") positionPopover(trigger, pop);
        });
      }
      return;
    }

    // Desktop: follow the trigger on scroll, staying open. Touch: dismiss on an
    // outside scroll instead (like Select) so it doesn't ride along on a phone.
    const place = () => positionPopover(trigger, pop);
    const placeThrottled = rafThrottle(place);
    const onScroll = (e) => {
      if (overlayIsDesktop.matches) placeThrottled();
      else if (!pop.contains(e.target)) pop.hidePopover();
    };
    // A calendar panel or a role="dialog" popover moves focus inside on open (like
    // shadcn), so keyboard/screen-reader users land in it. Calendar has controls to
    // land on; a plain dialog with no focusable content takes focus on the panel
    // itself (it carries tabindex="-1"). The native popover returns focus to the
    // trigger on close, so no manual restore is needed.
    const movesFocusIn = pop.querySelector(".calendar") || pop.getAttribute("role") === "dialog";
    const focusFirst = movesFocusIn
      ? () => {
          const el = pop.querySelector(
            'button:not([disabled]), select, [href], input, textarea, [tabindex]:not([tabindex="-1"])'
          );
          (el || pop).focus();
        }
      : null;
    // The native popover doesn't reflect open state to the trigger, so sync
    // aria-expanded ourselves (screen readers otherwise never hear open/closed).
    trigger.setAttribute("aria-expanded", "false");
    pop.addEventListener("toggle", (e) => {
      trigger.setAttribute("aria-expanded", String(e.newState === "open"));
      if (e.newState === "open") {
        place();
        focusFirst?.();
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", placeThrottled);
      } else {
        window.removeEventListener("scroll", onScroll, true);
        window.removeEventListener("resize", placeThrottled);
      }
    });

    // Native auto-popover light-dismisses on outside click / Esc. We also close
    // on a genuine Tab-away, but must NOT close when the user clicks the
    // popover's own non-interactive area (dead space, weekday row, inert
    // outside days): that blurs focus to <body>, which shadcn keeps open.
    // Defer so we read where focus actually settled, not the transient blur.
    const onFocusOut = () => {
      requestAnimationFrame(() => {
        if (!pop.matches(":popover-open")) return;
        const a = document.activeElement;
        // Keep open unless focus genuinely moved to another control. Clicking the
        // popover's own dead space bubbles focus to a focusable ancestor (e.g. the
        // skip-target .wrap, tabindex=-1) or <body>; neither is a Tab-away.
        if (!a || a === trigger || a === document.body || pop.contains(a) || a.contains(pop))
          return;
        pop.hidePopover();
      });
    };
    trigger.addEventListener("focusout", onFocusOut);
    pop.addEventListener("focusout", onFocusOut);
  });
}

// Dropdown menu (menu-button pattern) on the native Popover API: the trigger's
// popovertarget gives top-layer rendering, light-dismiss, Esc, and focus-return
// for free. app.js adds the menu keyboard model, focus moves INTO the menu and
// roves across items (arrow keys), items carry tabindex="-1" so Tab leaves,
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

    // The native popover owns show/hide; react to its toggle to sync the trigger
    // state and move focus in. (Fallback positioning is in initPopovers.)
    const scroll = overlayScroll(list, () => list.hidePopover());
    let openEdge = "first";
    list.addEventListener("toggle", (e) => {
      const open = e.newState === "open";
      trigger.setAttribute("aria-expanded", String(open));
      if (!open) {
        scroll.onClose();
        return;
      }
      scroll.onOpen();
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
    // so just dismiss, the popover hands focus back to the trigger.
    list.addEventListener("click", (e) => {
      if (e.target.closest(".menu__item")) list.hidePopover();
    });
  });
}

// Pagination: renders a bounded page window and keeps it interactive. The
// window always shows the first and last page, the current page ±1, and an
// ellipsis wherever there's a gap, the standard pattern. Seed with data-total
// and data-page; clicking a number or prev/next re-renders in place.
function initPagination() {
  const chevron = (d) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}" /></svg>`;
  const CHEVRON_LEFT = chevron("M15 6l-6 6l6 6");
  const CHEVRON_RIGHT = chevron("M9 6l6 6l-6 6");

  // Pages to show: 1, current-1..current+1, total, with "ellipsis" markers
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
    // The trigger is whichever child isn't the bubble, don't assume position.
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
      clearTimeout(hideTimer);
      place();
      bubble.classList.add("is-visible");
      // Fixed-position bubble would float away from the trigger on scroll,
      // just dismiss it instead.
      window.addEventListener("scroll", onScroll, { capture: true, passive: true });
      document.addEventListener("keydown", onKeydown, true);
    };
    // WCAG 1.4.13 (hoverable): keep it up while the pointer is over the trigger
    // OR the bubble, so a user can move onto the tooltip to read it. A short
    // grace delay covers the gap between the two.
    let hideTimer;
    const scheduleHide = () => {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hide, 120);
    };

    root.addEventListener("mouseenter", show);
    root.addEventListener("mouseleave", scheduleHide);
    bubble.addEventListener("mouseenter", () => clearTimeout(hideTimer));
    bubble.addEventListener("mouseleave", scheduleHide);
    root.addEventListener("focusin", show);
    // Ignore focus moving between the trigger's own descendants; only hide when
    // focus actually leaves the trigger.
    root.addEventListener("focusout", (e) => {
      if (!e.relatedTarget || !root.contains(e.relatedTarget)) hide();
    });
  });
}

// Body scroll-lock for open modals (Dialog + Sheet). Locking the page is the
// standard modal behaviour, one scroll context, no
// double-scroll. --scrollbar-comp reserves the removed scrollbar's width so the
// page doesn't shift as it disappears.
let scrollLockCount = 0;
function lockBodyScroll() {
  const root = document.documentElement;
  scrollLockCount += 1;
  if (scrollLockCount > 1) return; // an outer overlay already holds the lock
  const comp = window.innerWidth - root.clientWidth;
  root.style.setProperty("--scrollbar-comp", comp + "px");
  root.classList.add("is-scroll-locked");
}
function unlockBodyScroll() {
  const root = document.documentElement;
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount > 0) return; // another overlay is still open, stay locked
  root.classList.remove("is-scroll-locked");
  root.style.removeProperty("--scrollbar-comp");
}

// A wide .table-wrap scrolls, but overflow:auto alone isn't keyboard-reachable.
// Make it a focusable region ONLY while it actually overflows, so a table that
// fits its column doesn't leave an empty tab stop. ResizeObserver re-checks on
// layout changes (responsive breakpoints, font swaps).
function initTables() {
  document.querySelectorAll(".table-wrap").forEach((wrap) => {
    const label =
      wrap.getAttribute("aria-label") ||
      wrap.querySelector("caption")?.textContent.trim() ||
      "Scrollable table";
    const sync = () => {
      if (wrap.scrollWidth > wrap.clientWidth + 1) {
        wrap.setAttribute("role", "region");
        wrap.setAttribute("tabindex", "0");
        wrap.setAttribute("aria-label", label);
      } else {
        wrap.removeAttribute("role");
        wrap.removeAttribute("tabindex");
      }
    };
    sync();
    if (typeof ResizeObserver === "function") new ResizeObserver(sync).observe(wrap);
  });
}

// Dialog + Sheet (both native <dialog>): open via [data-dialog-open], close via
// [data-dialog-close] or a click on the backdrop. One delegated listener so
// dynamically-added dialogs work too. Body scroll locks while a modal is open.
function initDialogs() {
  // Name every modal from its title so screen readers announce more than "dialog"
  // (mirrors the React Dialog/Sheet aria-labelledby wiring).
  document.querySelectorAll("dialog.dialog, dialog.sheet").forEach((dlg, i) => {
    const title = dlg.querySelector(".dialog__title, .sheet__title");
    if (title && !dlg.hasAttribute("aria-labelledby") && !dlg.hasAttribute("aria-label")) {
      if (!title.id) title.id = dlg.id ? `${dlg.id}-title` : `dialog-title-${i}`;
      dlg.setAttribute("aria-labelledby", title.id);
    }
    // Point aria-describedby at the dialog's short body text so a consequence
    // (e.g. a destructive-action warning) is announced on open. Deliberately not
    // the sheet body: it's long prose and would be read out in full on open.
    const desc = dlg.querySelector(".dialog__text");
    if (desc && !dlg.hasAttribute("aria-describedby")) {
      if (!desc.id) desc.id = dlg.id ? `${dlg.id}-desc` : `dialog-desc-${i}`;
      dlg.setAttribute("aria-describedby", desc.id);
    }
  });

  document.addEventListener("click", (event) => {
    const opener = event.target.closest("[data-dialog-open]");
    if (opener) {
      const dlg = document.getElementById(opener.dataset.dialogOpen);
      if (dlg && !dlg.open && typeof dlg.showModal === "function") {
        lockBodyScroll();
        dlg.showModal();
        // Unlock on ANY close path, the close button, a backdrop click, or Esc
        // (Esc closes natively without a click, so hook the dialog's own event).
        dlg.addEventListener("close", unlockBodyScroll, { once: true });
        // showModal() auto-focuses the first focusable child (e.g. the close
        // button), which paints a stray focus ring on open. Move focus to a
        // non-visible holder, the panel inner, so keyboard/Esc still work with
        // nothing highlighted (matches the sidebar drawer).
        const holder = dlg.querySelector(".sheet__inner, .dialog__inner");
        if (holder) {
          holder.tabIndex = -1;
          holder.focus({ preventScroll: true });
        }
      }
      return;
    }
    const closer = event.target.closest("[data-dialog-close]");
    if (closer) {
      closer.closest("dialog")?.close();
      return;
    }
    // Backdrop click: the target is the <dialog> itself, not its inner content.
    // Hit-test against the dialog's box so a click on the element's own padding
    // doesn't count. Covers Dialog and Sheet, both are native <dialog>s.
    const openDialog = event.target.closest("dialog.dialog, dialog.sheet");
    if (openDialog && event.target === openDialog) {
      const r = openDialog.getBoundingClientRect();
      const inBox =
        event.clientX >= r.left &&
        event.clientX <= r.right &&
        event.clientY >= r.top &&
        event.clientY <= r.bottom;
      if (!inBox) openDialog.close();
    }
  });
}

// Typeahead over this project's pages: type to see matching results, Enter
// goes to the highlighted one (first by default), click/arrow-keys to pick.
// The page list is read from the sidebar the search sits alongside.
function wireSearch() {
  const input = document.querySelector(".site-nav__search");
  const results = document.querySelector(".site-nav__results");
  if (!input || !results) return;
  const pages = [...document.querySelectorAll(".sidebar__link")].map((a) => ({
    href: a.getAttribute("href"),
    label: a.textContent.trim()
  }));
  let matches = [];
  let active = -1;

  const close = () => {
    results.hidden = true;
    results.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  };

  const paint = () => {
    const items = results.querySelectorAll(".site-nav__result[data-href]");
    items.forEach((li, i) => {
      const on = i === active;
      li.classList.toggle("is-active", on);
      li.setAttribute("aria-selected", String(on));
    });
    // Expose the highlighted row to assistive tech so arrowing announces it.
    const activeEl = items[active];
    if (activeEl) input.setAttribute("aria-activedescendant", activeEl.id);
    else input.removeAttribute("aria-activedescendant");
  };

  const move = (delta) => {
    if (!matches.length) return;
    active = (active + delta + matches.length) % matches.length;
    paint();
  };

  const go = () => {
    if (matches[active]) location.href = matches[active].href;
  };

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) return close();
    matches = pages.filter((p) => p.label.toLowerCase().includes(q)).slice(0, 8);
    input.setAttribute("aria-expanded", "true");
    results.hidden = false;
    if (!matches.length) {
      active = -1;
      results.innerHTML =
        '<li class="site-nav__result site-nav__result--empty" role="presentation">No matches</li>';
      return;
    }
    active = 0;
    results.innerHTML = matches
      .map(
        (p, i) =>
          `<li class="site-nav__result" id="nav-search-result-${i}" role="option" aria-selected="false" data-href="${p.href}">${p.label}</li>`
      )
      .join("");
    paint();
  });

  input.addEventListener("keydown", (event) => {
    if (results.hidden) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      go();
    } else if (event.key === "Escape") {
      close();
    }
  });

  // Hover moves the selection so there's only ever one highlight and Enter
  // follows the cursor.
  results.addEventListener("mouseover", (event) => {
    const li = event.target.closest(".site-nav__result[data-href]");
    if (!li) return;
    active = [...results.querySelectorAll(".site-nav__result")].indexOf(li);
    paint();
  });

  // pointerdown (not click) fires before the input's blur closes the list.
  results.addEventListener("pointerdown", (event) => {
    const li = event.target.closest(".site-nav__result[data-href]");
    if (!li) return;
    event.preventDefault();
    location.href = li.dataset.href;
  });

  input.addEventListener("blur", () => setTimeout(close, 120));
}

function init() {
  // iOS Safari only fires :active on tap when a touch listener exists somewhere
  // in the document. A no-op on the document enables every component's pressed
  // state on touch (full JS apps get this for free from their own listeners;
  // a static site has to opt in).
  document.addEventListener("touchstart", () => {}, { passive: true });

  toast.mount();
  injectNav();
  injectSkipLink();
  injectSidebar();
  wireSearch();
  injectPagination();
  injectCodeCopy();
  hydrateSource();
  initExamples();
  hydrateProjectLinks();
  hydrateLinkListArrows();
  renderPalette();
  hydratePalette();
  hydratePreviews();
  initGridTabs();
  initSelects();
  initComboboxes();
  initCalendars();
  initPopovers();
  initMenus();
  initPagination();
  initSliders();
  initTooltips();
  initDialogs();
  initTables();
  refreshResponsive();

  let frame;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(refreshResponsive);
  });

  // "g" toggles the grid overlay on any page that includes it. Ignore the key
  // while typing in a field or when a modifier is held, so shortcuts and text
  // entry aren't hijacked.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "g" && event.key !== "G") return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const el = event.target;
    if (el.closest("input, textarea, select, [contenteditable]")) return;
    if (!document.querySelector("[data-grid-overlay]")) return;
    event.preventDefault();
    setGridOverlay();
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
      setGridOverlay();
      return;
    }
    const cssBtn = event.target.closest("[data-copy-css]");
    if (cssBtn) {
      const src = cssBtn.dataset.copyCss;
      const filter = cssBtn.dataset.copyTokens; // optional: comma-list of prefixes
      const section = cssBtn.dataset.copySection; // optional: a components.css section
      const label = section
        ? "Copied CSS"
        : filter
          ? "Copied variables"
          : `Copied ${src.split("/").pop()}`;
      fetch(src)
        .then((r) => r.text())
        .then((text) => {
          const out = section
            ? extractSection(text, section)
            : filter
              ? filterTokens(text, filter)
              : text.trim();
          copyText(out, label);
        })
        .catch(() => toast("Copy failed"));
      return;
    }
    const codeCopy = event.target.closest(".code-copy");
    if (codeCopy) {
      const code = codeCopy.parentElement.querySelector("code");
      if (!code) return;
      // navigator.clipboard is undefined on insecure origins (file://, plain
      // http), so guard before deref — otherwise it throws before the .catch.
      if (!navigator.clipboard) {
        toast("Copy failed");
        return;
      }
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
