import { useEffect, useId, useRef, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";

// Custom single-select: a styled trigger + a floating listbox. Reach for Native Select unless
// you need custom option rendering. Focus stays on the trigger; the active option is tracked
// with aria-activedescendant. Uncontrolled via defaultValue; pass value + onChange to control.
export default function Select({
  options,
  value,
  defaultValue,
  onChange,
  fill,
  "aria-label": ariaLabel
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? options[0]);
  const selected = value ?? uncontrolled;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, options.indexOf(selected)));
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const id = useId();
  const buf = useRef("");
  const bufTimer = useRef(0);

  const choose = (i) => {
    if (value === undefined) setUncontrolled(options[i]);
    onChange?.(options[i]);
    setActive(i);
    setOpen(false);
  };
  const move = (i) => setActive((i + options.length) % options.length);

  const typeahead = (char) => {
    clearTimeout(bufTimer.current);
    buf.current += char.toLowerCase();
    bufTimer.current = setTimeout(() => (buf.current = ""), 500);
    const from = buf.current.length === 1 ? active + 1 : active;
    for (let n = 0; n < options.length; n += 1) {
      const idx = (from + n) % options.length;
      if (options[idx].toLowerCase().startsWith(buf.current)) return setActive(idx);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      return;
    }
    const nav = {
      ArrowDown: () => move(active + 1),
      ArrowUp: () => move(active - 1),
      Home: () => setActive(0),
      End: () => setActive(options.length - 1),
      Enter: () => (open ? choose(active) : setOpen(true)),
      " ": () => (open ? choose(active) : setOpen(true))
    };
    if (e.key in nav) {
      e.preventDefault();
      if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        setOpen(true);
        return;
      }
      nav[e.key]();
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!open) setOpen(true);
      typeahead(e.key);
    }
  };

  // Top-layer popover (matches the CSS) so the list escapes clipping ancestors.
  useEffect(() => {
    const list = listRef.current;
    if (!list || !open) return;
    const place = () => {
      const r = rootRef.current.getBoundingClientRect();
      list.style.width = `${r.width}px`;
      list.style.left = `${r.left}px`;
      const h = list.offsetHeight;
      const below = window.innerHeight - r.bottom;
      list.style.top =
        below < h + 4 && r.top > below ? `${Math.max(4, r.top - h - 4)}px` : `${r.bottom + 4}px`;
    };
    list.showPopover();
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      if (list.matches(":popover-open")) list.hidePopover();
    };
  }, [open]);

  return (
    <div
      className={["select", fill && "select--fill"].filter(Boolean).join(" ")}
      ref={rootRef}
      onBlur={(e) => {
        if (!rootRef.current.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        <span className="select__value">{selected}</span>
        <IconChevronDown className="select__chevron" aria-hidden="true" />
      </button>
      <ul className="select__list" role="listbox" tabIndex={-1} ref={listRef} popover="manual">
        {options.map((opt, i) => (
          <li
            key={opt}
            id={`${id}-${i}`}
            className={["select__option", i === active && "is-active"].filter(Boolean).join(" ")}
            role="option"
            aria-selected={opt === selected}
            onMouseDown={(e) => e.preventDefault()}
            onMouseMove={() => setActive(i)}
            onClick={() => choose(i)}
          >
            {opt}
          </li>
        ))}
      </ul>
    </div>
  );
}
