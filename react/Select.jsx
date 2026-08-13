import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconChevronDown } from "@tabler/icons-react";

// Coalesce scroll/resize repositioning to one update per frame.
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

// Position a portaled list in PAGE coordinates (scrolls with the document, glued
// to the trigger), measured against the visual viewport so the keyboard is
// accounted for. Prefers below; hysteresis keeps it on its side, clipping down to
// MIN before flipping, so it behaves the same both ways. Returns the new side.
function positionFloating(anchor, list, wasAbove) {
  const GAP = 4;
  const PAD = 8;
  const MIN = 88;
  const vv = window.visualViewport;
  const viewBottom = vv ? vv.height : window.innerHeight;
  const rect = anchor.getBoundingClientRect();
  list.style.width = `${rect.width}px`;
  list.style.left = `${rect.left + window.scrollX}px`;
  list.style.maxHeight = "";
  const natural = list.offsetHeight;
  const roomBelow = viewBottom - rect.bottom - GAP - PAD;
  const roomAbove = rect.top - GAP - PAD;
  let above;
  if (wasAbove === undefined) above = roomBelow < Math.min(natural, MIN) && roomAbove > roomBelow;
  else if (wasAbove) above = !(roomAbove < MIN && roomBelow > roomAbove);
  else above = roomBelow < MIN && roomAbove > roomBelow;
  if (above) {
    const h = Math.min(natural, Math.max(0, roomAbove));
    list.style.top = `${rect.top + window.scrollY - h - GAP}px`;
    if (natural > roomAbove) list.style.maxHeight = `${Math.max(0, roomAbove)}px`;
  } else {
    list.style.top = `${rect.bottom + window.scrollY + GAP}px`;
    if (natural > roomBelow) list.style.maxHeight = `${Math.max(0, roomBelow)}px`;
  }
  return above;
}

// Custom single-select: a styled trigger + a floating listbox. Reach for Native Select unless
// you need custom option rendering. Focus stays on the trigger; the active option is tracked
// with aria-activedescendant. Uncontrolled via defaultValue; pass value + onChange to control.
export default function Select({
  options,
  value,
  defaultValue,
  onChange,
  fill,
  disabled,
  "aria-label": ariaLabel
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? options[0]);
  const selected = value ?? uncontrolled;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, options.indexOf(selected)));
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const aboveRef = useRef();
  const pointerRef = useRef(null); // last real pointer pos, to ignore scroll-synthesized moves
  const id = useId();
  const buf = useRef("");
  const bufTimer = useRef(0);

  useEffect(() => setMounted(true), []);

  // The list is portaled to <body> so it escapes clipping ancestors, positioned
  // in page coordinates (glued to the trigger); keep it placed while open.
  useEffect(() => {
    const list = listRef.current;
    if (!list || !open) return;
    aboveRef.current = undefined;
    const place = () => {
      aboveRef.current = positionFloating(rootRef.current, list, aboveRef.current);
    };
    const reflow = rafThrottle(place);
    place();
    window.addEventListener("scroll", reflow, true);
    window.addEventListener("resize", reflow);
    window.visualViewport?.addEventListener("resize", reflow);
    window.visualViewport?.addEventListener("scroll", reflow);
    return () => {
      window.removeEventListener("scroll", reflow, true);
      window.removeEventListener("resize", reflow);
      window.visualViewport?.removeEventListener("resize", reflow);
      window.visualViewport?.removeEventListener("scroll", reflow);
    };
  }, [open]);

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
      className={["select", fill && "select--fill"].filter(Boolean).join(" ")}
      ref={rootRef}
      onBlur={(e) => {
        const to = e.relatedTarget;
        if (to && !rootRef.current.contains(to) && !listRef.current?.contains(to)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        <span className="select__value">{selected}</span>
        <IconChevronDown className="select__chevron" aria-hidden="true" />
      </button>
      {mounted &&
        createPortal(
          <ul className="select__list" role="listbox" tabIndex={-1} ref={listRef} hidden={!open}>
            {options.map((opt, i) => (
              <li
                key={opt}
                id={`${id}-${i}`}
                className={["select__option", i === active && "is-active"]
                  .filter(Boolean)
                  .join(" ")}
                role="option"
                aria-selected={opt === selected}
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={(e) => {
                  // Wheel-scrolling slides rows under a still pointer, firing a
                  // synthetic move (same clientX/Y). Only a real move re-highlights.
                  const p = pointerRef.current;
                  if (p && e.clientX === p.x && e.clientY === p.y) return;
                  pointerRef.current = { x: e.clientX, y: e.clientY };
                  setActive(i);
                }}
                onClick={() => choose(i)}
              >
                {opt}
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
}
