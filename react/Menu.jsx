import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";

// Button that opens a floating menu of actions over the native popover API. Parts: Menu /
// MenuTrigger / MenuList / MenuItem / MenuSeparator / MenuShortcut. The popover owns
// show/hide/dismiss; MenuList adds the keyboard model (roving arrows, Home/End, type-ahead).
const MenuContext = createContext(null);

export function Menu({ children, className }) {
  const id = useId();
  const listRef = useRef(null);
  const openEdge = useRef("first"); // which item to focus when opened by keyboard
  const [open, setOpen] = useState(false);
  return (
    <MenuContext.Provider value={{ id, listRef, openEdge, open, setOpen }}>
      <div className={["menu", className].filter(Boolean).join(" ")}>{children}</div>
    </MenuContext.Provider>
  );
}

export function MenuTrigger({ children }) {
  const { id, listRef, openEdge, open } = useContext(MenuContext);
  return (
    <button
      className="menu__trigger"
      type="button"
      popoverTarget={id}
      aria-haspopup="menu"
      aria-expanded={open}
      onKeyDown={(e) => {
        // Enter/Space are the button's native toggle; arrows open and land on an edge.
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        e.preventDefault();
        openEdge.current = e.key === "ArrowUp" ? "last" : "first";
        listRef.current?.showPopover();
      }}
    >
      {children}
      <IconChevronDown className="menu__chevron" aria-hidden="true" />
    </button>
  );
}

export function MenuList({ children }) {
  const { id, listRef, openEdge, setOpen } = useContext(MenuContext);
  const buf = useRef("");
  const bufTimer = useRef(0);

  const itemEls = () => [...listRef.current.querySelectorAll(".menu__item:not([disabled])")];
  const focusItem = (i) => {
    const els = itemEls();
    if (els.length) els[(i + els.length) % els.length].focus();
  };

  useEffect(() => {
    const list = listRef.current;
    const onToggle = (e) => {
      const isOpen = e.newState === "open";
      setOpen(isOpen);
      if (isOpen) {
        focusItem(openEdge.current === "last" ? -1 : 0);
        openEdge.current = "first";
      }
    };
    list.addEventListener("toggle", onToggle);
    return () => list.removeEventListener("toggle", onToggle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "Tab") {
      listRef.current.hidePopover();
      return;
    }
    const current = itemEls().indexOf(document.activeElement);
    const nav = { ArrowDown: current + 1, ArrowUp: current - 1, Home: 0, End: -1 };
    if (e.key in nav) {
      e.preventDefault();
      focusItem(nav[e.key]);
      return;
    }
    // Type-ahead: jump to the next item whose label starts with the typed buffer.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      clearTimeout(bufTimer.current);
      buf.current += e.key.toLowerCase();
      bufTimer.current = setTimeout(() => (buf.current = ""), 500);
      const els = itemEls();
      const from = buf.current.length === 1 ? current + 1 : current;
      for (let n = 0; n < els.length; n += 1) {
        const idx = (from + n) % els.length;
        if (els[idx].textContent.trim().toLowerCase().startsWith(buf.current)) {
          els[idx].focus();
          return;
        }
      }
    }
  };

  return (
    <div
      className="menu__list popover"
      id={id}
      popover="auto"
      role="menu"
      ref={listRef}
      onKeyDown={onKeyDown}
      onClick={(e) => {
        if (e.target.closest(".menu__item")) listRef.current.hidePopover();
      }}
    >
      {children}
    </div>
  );
}

export function MenuItem({ children, danger, ...rest }) {
  const cls = ["menu__item", danger && "menu__item--danger"].filter(Boolean).join(" ");
  return (
    <button className={cls} role="menuitem" tabIndex={-1} type="button" {...rest}>
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <hr className="menu__separator" />;
}

export function MenuShortcut({ children }) {
  return (
    <span className="menu__shortcut" aria-hidden="true">
      {children}
    </span>
  );
}
