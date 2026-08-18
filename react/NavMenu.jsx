import { Children, createContext, useContext, useId, useRef, useState } from "react";

const ItemContext = createContext(null);

// Row of links for moving between top-level destinations. Give an item a NavMenuPanel and it
// reveals on hover or keyboard focus (CSS). Mark the current link with `current`.
export function NavMenu({ children, "aria-label": ariaLabel }) {
  return (
    <nav className="nav-menu" aria-label={ariaLabel}>
      <ul className="nav-menu__list">{children}</ul>
    </nav>
  );
}

// Wires disclosure semantics CSS can't express: the trigger advertises its panel and reflects
// open state, and Esc collapses an open panel (returning focus to the trigger) even though
// focus-within would otherwise keep it open.
export function NavMenuItem({ children, ...rest }) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const triggerRef = useRef(null);
  const hasPanel = Children.toArray(children).some((c) => c?.type === NavMenuPanel);

  const handlers = hasPanel
    ? {
        onFocus: () => {
          setExpanded(true);
          setCollapsed(false);
        },
        onBlur: (e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setExpanded(false);
            setCollapsed(false);
          }
        },
        onPointerEnter: () => setCollapsed(false),
        onKeyDown: (e) => {
          if (e.key === "Escape") {
            setExpanded(false);
            setCollapsed(true);
            triggerRef.current?.focus();
          }
        }
      }
    : {};

  return (
    <li
      className="nav-menu__item"
      data-collapsed={collapsed ? "" : undefined}
      {...handlers}
      {...rest}
    >
      <ItemContext.Provider value={{ hasPanel, panelId, expanded, triggerRef }}>
        {children}
      </ItemContext.Provider>
    </li>
  );
}

export function NavMenuLink({ current, children, ...rest }) {
  const ctx = useContext(ItemContext);
  const panelProps = ctx?.hasPanel
    ? {
        ref: ctx.triggerRef,
        "aria-haspopup": "true",
        "aria-controls": ctx.panelId,
        "aria-expanded": ctx.expanded
      }
    : {};
  return (
    <a
      className="nav-menu__link"
      aria-current={current ? "page" : undefined}
      {...panelProps}
      {...rest}
    >
      {children}
    </a>
  );
}

export function NavMenuPanel({ children, ...rest }) {
  const ctx = useContext(ItemContext);
  return (
    <div className="nav-menu__menu" id={ctx?.panelId} {...rest}>
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
