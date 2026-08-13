// Shared chrome for the /example mini-site, one source for the topbar, footer,
// menu sheet, and grid overlay. Each page drops
// <div data-chrome="topbar|footer|menu|grid-overlay"></div> placeholders; this
// deferred script (loaded before app.js) replaces them, marks the active nav
// link by path, and wires the menu's theme toggle. app.js then hydrates the
// injected dialog, select, footer, and grid overlay on DOMContentLoaded.
(function () {
  const TOPBAR = `
    <header class="ex-topbar">
      <a class="ex-topbar__brand" href="/demo/example/">Demo</a>
      <nav class="nav-menu ex-topbar__nav" aria-label="Primary">
        <ul class="nav-menu__list">
          <li class="nav-menu__item">
            <a class="nav-menu__link" href="/demo/example/blog/">Blog</a>
          </li>
          <li class="nav-menu__item">
            <a class="nav-menu__link" href="/demo/example/blog/post/">Article</a>
          </li>
          <li class="nav-menu__item">
            <a class="nav-menu__link" href="/demo/example/settings/">Settings</a>
            <div class="nav-menu__menu">
              <a class="nav-menu__menu-link" href="/demo/example/settings/about/">About you</a>
              <a class="nav-menu__menu-link" href="/demo/example/settings/communication/">
                Communication
              </a>
              <a class="nav-menu__menu-link" href="/demo/example/settings/privacy/">
                Privacy and security
              </a>
            </div>
          </li>
        </ul>
      </nav>
      <button
        class="button button--secondary button--with-end-icon ex-topbar__menu"
        type="button"
        data-dialog-open="ex-menu-sheet"
        aria-haspopup="dialog"
      >
        Menu
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 9h16" />
          <path d="M4 15h16" />
        </svg>
      </button>
    </header>
`;
  const FOOTER = `
    <footer class="ex-footer">
      <div class="ex-footer__inner">
        <div class="ex-footer__top">
          <div class="ex-footer__brand-block">
            <a class="ex-footer__brand" href="/demo/example/">Demo</a>
            <div class="select select--fill ex-footer__lang" data-select>
              <button
                class="select__trigger"
                type="button"
                aria-haspopup="listbox"
                aria-expanded="false"
                aria-label="Language"
              >
                <span class="select__value">
                  <img
                    class="ex-lang-flag"
                    src="/assets/flags/gb.svg"
                    alt=""
                    width="20"
                    height="20"
                  />
                  English
                </span>
                <svg
                  class="select__chevron"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6l6 -6" />
                </svg>
              </button>
              <!-- [html-validate-disable-next prefer-native-element -- custom listbox; Native Select is the native option] -->
              <ul class="select__list" role="listbox" tabindex="-1" hidden>
                <li class="select__option" role="option" aria-selected="true">
                  <img
                    class="ex-lang-flag"
                    src="/assets/flags/gb.svg"
                    alt=""
                    width="20"
                    height="20"
                  />
                  English
                </li>
                <li class="select__option" role="option">
                  <img
                    class="ex-lang-flag"
                    src="/assets/flags/no.svg"
                    alt=""
                    width="20"
                    height="20"
                  />
                  Norsk
                </li>
              </ul>
            </div>
          </div>

          <nav class="ex-footer__nav" aria-label="Footer">
            <details class="ex-footer__col" open>
              <summary class="ex-footer__col-head">
                Foundations
                <svg
                  class="ex-footer__col-chevron"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6l6 -6" />
                </svg>
              </summary>
              <ul class="ex-footer__col-list">
                <li><a href="#">Colours</a></li>
                <li><a href="#">Typography</a></li>
                <li><a href="#">Radii</a></li>
              </ul>
            </details>

            <details class="ex-footer__col">
              <summary class="ex-footer__col-head">
                Components
                <svg
                  class="ex-footer__col-chevron"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6l6 -6" />
                </svg>
              </summary>
              <ul class="ex-footer__col-list">
                <li><a href="#">Buttons</a></li>
                <li><a href="#">Cards</a></li>
                <li><a href="#">Inputs</a></li>
                <li><a href="#">Dialogs</a></li>
              </ul>
            </details>

            <details class="ex-footer__col">
              <summary class="ex-footer__col-head">
                Resources
                <svg
                  class="ex-footer__col-chevron"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6l6 -6" />
                </svg>
              </summary>
              <ul class="ex-footer__col-list">
                <li><a href="#">Getting started</a></li>
                <li><a href="#">Tokens</a></li>
                <li><a href="#">Theming</a></li>
                <li><a href="#">Accessibility</a></li>
                <li><a href="#">Changelog</a></li>
              </ul>
            </details>
          </nav>
        </div>

        <hr class="separator ex-footer__divider" />

        <div class="ex-footer__bottom">
          <p class="ex-footer__copy">© 2026 Kristian Paulsen</p>
          <div class="ex-footer__legal">
            <a href="#">Privacy</a>
            <span class="ex-footer__dot" aria-hidden="true">·</span>
            <a href="#">Terms</a>
          </div>
          <ul class="ex-footer__social">
            <li>
              <a href="#" aria-label="X">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 4l11.733 16h4.267l-11.733 -16l-4.267 0" />
                  <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
                </svg>
              </a>
            </li>
            <li>
              <a href="#" aria-label="Instagram">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path
                    d="M4 8a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4l0 -8"
                  />
                  <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
                  <path d="M16.5 7.5v.01" />
                </svg>
              </a>
            </li>
            <li>
              <a href="#" aria-label="Discord">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M8 12a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" />
                  <path d="M14 12a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" />
                  <path
                    d="M15.5 17c0 1 1.5 3 2 3c1.5 0 2.833 -1.667 3.5 -3c.667 -1.667 .5 -5.833 -1.5 -11.5c-1.457 -1.015 -3 -1.34 -4.5 -1.5l-.972 1.923a11.913 11.913 0 0 0 -4.053 0l-.975 -1.923c-1.5 .16 -3.043 .485 -4.5 1.5c-2 5.667 -2.167 9.833 -1.5 11.5c.667 1.333 2 3 3.5 3c.5 0 2 -2 2 -3"
                  />
                  <path d="M7 16.5c3.5 1 6.5 1 10 0" />
                </svg>
              </a>
            </li>
            <li>
              <a href="#" aria-label="Facebook">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path
                    d="M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3"
                  />
                </svg>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
`;
  const MENU = `
    <dialog class="sheet ex-menu" id="ex-menu-sheet" aria-label="Menu">
      <div class="sheet__inner">
        <div class="ex-menu__head">
          <a class="ex-topbar__brand ex-menu__brand" href="/demo/example/">Demo</a>
          <button
            class="button button--secondary button--with-end-icon ex-menu__close"
            type="button"
            data-dialog-close
          >
            Close
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6l-12 12" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="ex-menu__scroll">
          <nav class="ex-menu__nav" aria-label="Pages">
            <a href="/demo/example/blog/">Blog</a>
            <a href="/demo/example/blog/post/">Article</a>
            <a href="/demo/example/settings/">Settings</a>
          </nav>

          <hr class="separator ex-menu__divider" />

          <div class="ex-menu__links">
            <a href="#">Colours</a>
            <a href="#">Typography</a>
            <a href="#">Radii</a>
            <a href="#">Buttons</a>
            <a href="#">Cards</a>
            <a href="#">Inputs</a>
          </div>
        </div>

        <div class="ex-menu__foot">
          <div class="tabs tabs--pill ex-menu__theme" role="radiogroup" aria-label="Theme">
            <input
              type="radio"
              name="ex-theme-menu"
              id="ex-theme-menu-light"
              class="tabs__radio"
              data-theme-opt="light"
              checked
            />
            <label class="tabs__tab" for="ex-theme-menu-light">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
                <path
                  d="M3 12h1M12 3v1M20 12h1M12 20v1M5.6 5.6l.7 .7M18.4 5.6l-.7 .7M17.7 17.7l.7 .7M6.3 17.7l-.7 .7"
                />
              </svg>
              <span class="tabs__label">Light</span>
            </label>
            <input
              type="radio"
              name="ex-theme-menu"
              id="ex-theme-menu-dark"
              class="tabs__radio"
              data-theme-opt="dark"
            />
            <label class="tabs__tab" for="ex-theme-menu-dark">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path
                  d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"
                />
              </svg>
              <span class="tabs__label">Dark</span>
            </label>
          </div>
        </div>
      </div>
    </dialog>
`;
  // Grid overlay, toggled with the "g" key (see app.js). Width follows the
  // page's live grid tokens; blog opts into the wider 2xl tier via
  // data-width on <html>, and buildGridOverlay() rebuilds columns/margins from
  // whatever --container-max / --grid-columns / --grid-margin resolve to.
  const GRID_OVERLAY = `
    <div class="grid-overlay" data-grid-overlay hidden aria-hidden="true">
      <div class="grid-overlay__inner">
        <span class="grid-overlay__margin grid-overlay__margin--left">
          <span class="grid-overlay__margin-label" data-grid-margin-label></span>
        </span>
        <span class="grid-overlay__margin grid-overlay__margin--right">
          <span class="grid-overlay__margin-label" data-grid-margin-label></span>
        </span>
        <div class="grid-overlay__cols" data-grid-cols></div>
      </div>
    </div>
`;
  function inject(name, html) {
    const ph = document.querySelector('[data-chrome="' + name + '"]');
    if (ph) ph.outerHTML = html;
  }
  inject("topbar", TOPBAR);
  inject("footer", FOOTER);
  inject("menu", MENU);
  inject("grid-overlay", GRID_OVERLAY);

  // Mark the current page's nav link (topbar + menu) by matching href to path.
  const path = location.pathname;
  document.querySelectorAll(".ex-topbar__nav a, .ex-menu__nav a").forEach(function (a) {
    if (a.getAttribute("href") === path) a.setAttribute("aria-current", "page");
  });

  // Theme toggle lives in the injected menu; keep every theme control in sync.
  const radios = document.querySelectorAll(".tabs__radio[data-theme-opt]");
  function applyTheme(t) {
    const root = document.documentElement;
    root.classList.add("no-transitions");
    root.dataset.theme = t;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.classList.remove("no-transitions");
      });
    });
    try {
      localStorage.setItem("theme", t);
    } catch {
      /* localStorage may be unavailable */
    }
    radios.forEach(function (r) {
      r.checked = r.dataset.themeOpt === t;
    });
  }
  radios.forEach(function (r) {
    r.addEventListener("change", function () {
      if (r.checked) applyTheme(r.dataset.themeOpt);
    });
  });
  applyTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
})();
