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

// Strip the common leading indentation from a block of text.
function dedent(text) {
  const lines = text.replace(/^\n+|\s+$/g, "").split("\n");
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
  return lines.map((l) => l.slice(indent)).join("\n");
}

/* ── Theme ─────────────────────────────────────────────────────────────── */

function currentTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("theme", theme);
  } catch {
    /* storage may be unavailable; theme still applies for this page */
  }
  const btn = document.querySelector(".theme-toggle");
  if (btn) btn.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
}

function injectNav() {
  if (document.querySelector(".site-nav")) return;
  const nav = document.createElement("header");
  nav.className = "site-nav";
  // Icons are Lucide (lucide.dev, ISC) — inlined so the shell stays dependency-free.
  const lucide = {
    menu: '<line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>',
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
          ${icon("menu")}
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
      { label: "Colors", href: "/demo/colors.html" },
      { label: "Type scale", href: "/demo/type.html" },
      { label: "Grid", href: "/demo/grid.html" },
      { label: "Spacing", href: "/demo/spacing.html" },
      { label: "Radii", href: "/demo/radii.html" },
      { label: "Shadows", href: "/demo/shadows.html" }
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
  // Enable animation only when the user actually interacts — that way a
  // viewport resize across the mobile breakpoint doesn't slide the drawer.
  const enableAnim = () => aside.classList.add("is-anim");
  const close = () => {
    aside.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
  };
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      enableAnim();
      const open = !aside.classList.contains("is-open");
      aside.classList.toggle("is-open", open);
      backdrop.classList.toggle("is-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
    });
  }
  backdrop.addEventListener("click", () => {
    enableAnim();
    close();
  });
  aside.addEventListener("click", (e) => {
    if (e.target.closest(".sidebar__link")) close();
  });
}

/* ── Token hydration ───────────────────────────────────────────────────── */

// Fill each palette chip's colour + value from its :root token.
// Sub-chips (hover / active) show just the suffix — the indent already ties
// them to the base above.
function hydratePalette() {
  const rootStyle = getComputedStyle(document.documentElement);
  document.querySelectorAll(".palette__row").forEach((row) => {
    const chips = [...row.querySelectorAll(".palette__chip")];
    const baseToken = chips[0]?.dataset.token || "";
    chips.forEach((chip, i) => {
      const { token } = chip.dataset;
      if (!token) return;
      const value = rootStyle.getPropertyValue(`--${token}`).trim();
      if (!value) return;
      chip.style.setProperty("--c", value);
      const valueEl = chip.querySelector(".palette__value");
      if (valueEl) valueEl.textContent = value;
      const nameEl = chip.querySelector(".palette__name");
      if (nameEl && i > 0 && token.startsWith(baseToken + "-")) {
        nameEl.textContent = token.slice(baseToken.length);
      }
      chip.dataset.copy = value;
    });
  });
}

// Fill compact token chips (e.g. the size scale) from their :root token.
function hydrateTokenChips() {
  const rootStyle = getComputedStyle(document.documentElement);
  document.querySelectorAll(".token-chip").forEach((chip) => {
    const { token } = chip.dataset;
    if (!token) return;
    const value = rootStyle.getPropertyValue(`--${token}`).trim();
    if (!value) return;
    const valueEl = chip.querySelector(".token-chip__value");
    if (valueEl) valueEl.textContent = value;
    chip.dataset.copy = value;
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

// Read each type role's live computed metrics (they change across breakpoints).
// The copy target is the role's token value (rem), not the resolved px.
function hydrateType() {
  const rootStyle = getComputedStyle(document.documentElement);
  document.querySelectorAll(".type-row").forEach((row) => {
    const sample = row.querySelector(".type-row__sample");
    if (!sample) return;
    const cs = getComputedStyle(sample);
    const sizePx = parseFloat(cs.fontSize);
    setSpec(row, "size", `${Math.round(sizePx)}px`);
    setSpec(row, "lh", `lh ${Math.round(parseFloat(cs.lineHeight))}px`);
    setSpec(row, "weight", `w ${cs.fontWeight}`);
    const { token } = row.dataset;
    if (token) row.dataset.copy = rootStyle.getPropertyValue(`--${token}`).trim();
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
  hydrateTokenChips();
  buildGridOverlay();
  updateBreakpoint();
}

/* ── Init ──────────────────────────────────────────────────────────────── */

// Space bars + radius / shadow tiles — kept in a helper so theme changes can
// re-run them (shadow values are theme-dependent).
function hydratePreviews() {
  hydratePreview(".space-row", ".space-row__value", (el, value) => {
    const bar = el.querySelector("[data-space-bar]");
    if (bar) bar.style.width = value;
  });
  hydratePreview(".tile", ".tile__value", (el, value) => {
    const radius = el.querySelector("[data-radius-demo]");
    if (radius) radius.style.borderRadius = value;
    const shadow = el.querySelector("[data-shadow-demo]");
    if (shadow) shadow.style.boxShadow = value;
  });
}

function init() {
  injectNav();
  injectSidebar();
  hydratePalette();
  hydrateTokenChips();
  hydratePreviews();
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
      gridBtn.setAttribute("aria-pressed", String(show));
      gridBtn.textContent = show ? "Hide grid overlay" : "Show grid overlay";
      return;
    }
    const cssBtn = event.target.closest("[data-copy-css]");
    if (cssBtn) {
      const src = cssBtn.dataset.copyCss;
      // Support both an element id (legacy) and a URL to fetch.
      if (src.startsWith("/") || src.startsWith("http")) {
        fetch(src)
          .then((r) => r.text())
          .then((text) => copyText(text.trim(), "Copied all tokens"))
          .catch(() => toast("Copy failed"));
      } else {
        const block = document.getElementById(src);
        if (block) copyText(dedent(block.textContent), "Copied all tokens");
      }
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
