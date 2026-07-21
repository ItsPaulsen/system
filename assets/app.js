// Shared page script for every project page:
//   • injects the site nav (brand + theme toggle)
//   • click-to-copy + toast
//   • hydrates swatches / token chips / type rows from :root (the single source of truth)
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
  nav.innerHTML = `
    <div class="site-nav__inner">
      <div class="site-nav__left">
        <button class="site-nav__menu" type="button" aria-label="Toggle menu" aria-expanded="false">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
        <a class="site-nav__brand" href="/">system</a>
      </div>
      <button class="theme-toggle" type="button" aria-label="Switch theme">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" />
        </svg>
      </button>
    </div>`;
  document.body.prepend(nav);
  setTheme(currentTheme());
}

// Build the sidebar from the page's sections. Each <section data-nav-group="…"
// aria-labelledby="…"> becomes a link under its group, in document order.
function injectSidebar() {
  const sections = document.querySelectorAll("section[data-nav-group][aria-labelledby]");
  if (!sections.length || document.querySelector(".sidebar")) return;

  const groups = [];
  sections.forEach((section) => {
    const name = section.dataset.navGroup;
    const headingId = section.getAttribute("aria-labelledby");
    const heading = document.getElementById(headingId);
    if (!heading) return;
    let group = groups.find((g) => g.name === name);
    if (!group) {
      group = { name, links: [] };
      groups.push(group);
    }
    group.links.push({ id: headingId, label: heading.textContent.trim() });
  });

  const aside = document.createElement("aside");
  aside.className = "sidebar";
  aside.innerHTML = groups
    .map(
      (g) => `
      <div class="sidebar__group">
        <p class="sidebar__group-title">${g.name}</p>
        ${g.links
          .map(
            (l) => `<a class="sidebar__link" href="#${l.id}" data-nav-link="${l.id}">${l.label}</a>`
          )
          .join("")}
      </div>`
    )
    .join("");

  const backdrop = document.createElement("div");
  backdrop.className = "sidebar-backdrop";

  document.body.append(aside, backdrop);
  wireSidebar(aside, backdrop);
  spyScroll(aside);
}

function wireSidebar(aside, backdrop) {
  const menuBtn = document.querySelector(".site-nav__menu");
  const close = () => {
    aside.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
  };
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
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

// Highlight the sidebar link for whichever section is currently in view.
function spyScroll(aside) {
  const links = new Map(
    [...aside.querySelectorAll("[data-nav-link]")].map((a) => [a.dataset.navLink, a])
  );
  const setActive = (id) => {
    links.forEach((a, key) => a.classList.toggle("is-active", key === id));
  };
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (visible.length) {
        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        setActive(visible[0].target.getAttribute("aria-labelledby"));
      }
    },
    { rootMargin: `-${80}px 0px -60% 0px` }
  );
  document
    .querySelectorAll("section[data-nav-group][aria-labelledby]")
    .forEach((s) => observer.observe(s));
}

/* ── Token hydration ───────────────────────────────────────────────────── */

// Fill each swatch's chip, value and copy target from its :root token.
function hydrateSwatches() {
  const rootStyle = getComputedStyle(document.documentElement);
  document.querySelectorAll(".swatch").forEach((sw) => {
    const { token } = sw.dataset;
    if (!token) return;
    const value = rootStyle.getPropertyValue(`--${token}`).trim();
    if (!value) return;

    const chip = sw.querySelector(".swatch__chip");
    if (chip) chip.style.background = value;

    const valueEl = sw.querySelector(".swatch__value");
    if (valueEl) valueEl.textContent = value;

    sw.dataset.copy = value;
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

function init() {
  injectNav();
  injectSidebar();
  hydrateSwatches();
  hydrateTokenChips();
  hydratePreview(".palette__chip", ".palette__value", (el, value) => {
    const color = el.querySelector(".palette__color");
    if (color) color.style.background = value;
  });
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
      const block = document.getElementById(cssBtn.dataset.copyCss);
      if (block) copyText(dedent(block.textContent), "Copied all tokens");
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
