import { useId, useRef, useState } from "react";
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

  return (
    <div
      className={`select${fill ? " select--fill" : ""}`}
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
      <ul className="select__list" role="listbox" tabIndex={-1} hidden={!open}>
        {options.map((opt, i) => (
          <li
            key={opt}
            id={`${id}-${i}`}
            className={`select__option${i === active ? " is-active" : ""}`}
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
