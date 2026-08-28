import { useEffect, useId, useRef, useState } from "react";
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

// Position the list with position:fixed in viewport coordinates, glued to the
// trigger and measured against the visual viewport so the keyboard is accounted
// for. The list stays in the DOM (not portaled) so VoiceOver can follow
// aria-activedescendant into it. Prefers below; hysteresis keeps it on its side,
// clipping down to MIN before flipping, so it behaves the same both ways.
function positionFloating(anchor, list, wasAbove) {
  const GAP = 4;
  const PAD = 8;
  const MIN = 88;
  const vv = window.visualViewport;
  const viewBottom = vv ? vv.height : window.innerHeight;
  const rect = anchor.getBoundingClientRect();
  list.style.position = "fixed";
  list.style.width = `${rect.width}px`;
  list.style.left = `${rect.left}px`;
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
    list.style.top = `${rect.top - h - GAP}px`;
    if (natural > roomAbove) list.style.maxHeight = `${Math.max(0, roomAbove)}px`;
  } else {
    list.style.top = `${rect.bottom + GAP}px`;
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
  disabled,
  "aria-label": ariaLabel
}) {
  const [query, setQuery] = useState(defaultValue);
  const [selected, setSelected] = useState(defaultValue || null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); // no row pre-highlighted
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const aboveRef = useRef();
  const pointerRef = useRef(null); // last real pointer pos, to ignore scroll-synthesized moves
  const listId = useId();

  const q = query.trim().toLowerCase();
  const matches = options.filter((o) => q === "" || o.toLowerCase().includes(q));

  // Position the (in-DOM, position:fixed) list and keep it placed on
  // scroll/resize/keyboard. On touch, lift the field toward the top so the list
  // has room below it above the keyboard.
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
    // Capturing scroll also catches the list's own internal scroll (the active-row
    // scrollIntoView below), so ignore scrolls that originate inside the list —
    // re-placing on those rewrites inline styles and makes VoiceOver re-read.
    const onScroll = (e) => {
      if (e.target instanceof Node && list.contains(e.target)) return;
      reflow();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", reflow);
    window.visualViewport?.addEventListener("resize", reflow);
    window.visualViewport?.addEventListener("scroll", reflow);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", reflow);
      window.visualViewport?.removeEventListener("resize", reflow);
      window.visualViewport?.removeEventListener("scroll", reflow);
    };
  }, [open]);

  // Keep the active row visible on arrow nav (parity with the vanilla list).
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current
      ?.querySelector(".select__option.is-active")
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

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
        // The whole field is a hit target: clicking the padding
        // around the input/chevron focuses the input rather than doing nothing.
        onMouseDown={(e) => {
          if (e.target === inputRef.current || e.target.closest(".combobox__chevron")) return;
          e.preventDefault();
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        <input
          ref={inputRef}
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
          disabled={disabled}
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
        {/* Chevron toggles the list too; it's a non-focusable,
            aria-hidden span, a mouse affordance only, since the input already
            exposes open state and choices to the keyboard and screen readers. */}
        <span
          className="input__trailing combobox__chevron"
          aria-hidden="true"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const willOpen = !open;
            setOpen(willOpen);
            if (willOpen) inputRef.current?.focus();
          }}
        >
          <IconChevronDown />
        </span>
      </div>
      {/* Polite live region: the visible "No results" row is presentational, so
          announce the empty result set here instead. */}
      <div className="sr-only" role="status">
        {open && !matches.length ? "No results" : ""}
      </div>
      <ul
        className="select__list"
        id={listId}
        role="listbox"
        aria-label={ariaLabel}
        tabIndex={-1}
        ref={listRef}
        hidden={!open}
      >
        {matches.map((opt, i) => (
          <li
            key={opt}
            id={`${listId}-${i}`}
            className={["select__option", i === active && "is-active"].filter(Boolean).join(" ")}
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
      </ul>
    </div>
  );
}
