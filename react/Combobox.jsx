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

// Text field that filters a listbox as you type; Select with type-to-filter. `options` is an
// array of strings, `onChange(value)` fires on pick, `fill` swaps the outline for a solid skin.
export default function Combobox({
  options,
  defaultValue = "",
  onChange,
  fill,
  placeholder,
  "aria-label": ariaLabel
}) {
  const [query, setQuery] = useState(defaultValue);
  const [selected, setSelected] = useState(defaultValue || null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); // no row pre-highlighted
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const aboveRef = useRef();
  const pointerRef = useRef(null); // last real pointer pos, to ignore scroll-synthesized moves
  const listId = useId();

  const q = query.trim().toLowerCase();
  const matches = options.filter((o) => q === "" || o.toLowerCase().includes(q));

  useEffect(() => setMounted(true), []);

  // Portal the list to <body> (escapes clipping), position it in page coords, and
  // keep it placed on scroll/resize/keyboard. On touch, lift the field toward the
  // top so the list has room below it above the keyboard.
  useEffect(() => {
    const list = listRef.current;
    if (!list || !open) return;
    aboveRef.current = undefined;
    const place = () => {
      aboveRef.current = positionFloating(rootRef.current, list, aboveRef.current);
    };
    const reflow = rafThrottle(place);
    place();
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      requestAnimationFrame(() =>
        rootRef.current?.scrollIntoView({ block: "start", behavior: "smooth" })
      );
    }
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

  // Filtering changes the list height, so re-place it (keeping the current side).
  useEffect(() => {
    if (open && listRef.current) {
      aboveRef.current = positionFloating(rootRef.current, listRef.current, aboveRef.current);
    }
  }, [matches.length, open]);

  const choose = (opt) => {
    setQuery(opt);
    setSelected(opt);
    onChange?.(opt);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      if (!matches.length) return;
      setActive((i) => {
        if (i < 0) return e.key === "ArrowDown" ? 0 : matches.length - 1;
        return e.key === "ArrowDown"
          ? (i + 1) % matches.length
          : (i - 1 + matches.length) % matches.length;
      });
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      if (active >= 0 && matches[active]) choose(matches[active]);
      else setOpen(false);
    } else if (e.key === "Home" && open) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && open) {
      e.preventDefault();
      setActive(matches.length - 1);
    }
  };

  return (
    <div
      className="combobox"
      ref={rootRef}
      onBlur={(e) => {
        const to = e.relatedTarget;
        if (to && !rootRef.current.contains(to) && !listRef.current?.contains(to)) setOpen(false);
      }}
    >
      <div
        className={["input__container", "combobox__control", fill && "input__container--fill"]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          className="input__element"
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <span className="input__trailing combobox__chevron" aria-hidden="true">
          <IconChevronDown />
        </span>
      </div>
      {mounted &&
        createPortal(
          <ul
            className="select__list"
            id={listId}
            role="listbox"
            tabIndex={-1}
            ref={listRef}
            hidden={!open}
          >
            {matches.map((opt, i) => (
              <li
                key={opt}
                id={`${listId}-${i}`}
                className={["select__option", i === active && "is-active"]
                  .filter(Boolean)
                  .join(" ")}
                role="option"
                aria-selected={selected === opt}
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={(e) => {
                  // Wheel-scrolling slides rows under a still pointer, firing a
                  // synthetic move (same clientX/Y). Only a real move re-highlights.
                  const p = pointerRef.current;
                  if (p && e.clientX === p.x && e.clientY === p.y) return;
                  pointerRef.current = { x: e.clientX, y: e.clientY };
                  setActive(i);
                }}
                onClick={() => choose(opt)}
              >
                {opt}
              </li>
            ))}
            {!matches.length && (
              <li className="combobox__empty" role="presentation">
                No results
              </li>
            )}
          </ul>,
          document.body
        )}
    </div>
  );
}
