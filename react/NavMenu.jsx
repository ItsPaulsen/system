// Row of links for moving between top-level destinations. Give an item a NavMenuPanel and it
// reveals on hover or keyboard focus (CSS-only). Mark the current link with `current`.
export function NavMenu({ children, "aria-label": ariaLabel }) {
  return (
    <nav className="nav-menu" aria-label={ariaLabel}>
      <ul className="nav-menu__list">{children}</ul>
    </nav>
  );
}

export function NavMenuItem({ children, ...rest }) {
  return (
    <li className="nav-menu__item" {...rest}>
      {children}
    </li>
  );
}

export function NavMenuLink({ current, children, ...rest }) {
  return (
    <a className="nav-menu__link" aria-current={current ? "page" : undefined} {...rest}>
      {children}
    </a>
  );
}

export function NavMenuPanel({ children, ...rest }) {
  return (
    <div className="nav-menu__menu" {...rest}>
      {children}
    </div>
  );
}

export function NavMenuPanelLink({ children, ...rest }) {
  return (
    <a className="nav-menu__menu-link" {...rest}>
      {children}
    </a>
  );
}
