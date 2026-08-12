import { useEffect, useId, useRef, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";

// Position the popover list against the root; flip above when it won't fit below.
function placeListbox(root, list) {
  const r = root.getBoundingClientRect();
  list.style.width = `${r.width}px`;
  list.style.left = `${r.left}px`;
  const h = list.offsetHeight;
  const below = window.innerHeight - r.bottom;
  list.style.top =
    below < h + 4 && r.top > below ? `${Math.max(4, r.top - h - 4)}px` : `${r.bottom + 4}px`;
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
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const q = query.trim().toLowerCase();
  const matches = options.filter((o) => q === "" || o.toLowerCase().includes(q));

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
      const step = e.key === "ArrowDown" ? 1 : matches.length - 1;
      setActive((i) => (i + step) % matches.length);
    } else if (e.key === "Enter" && open && matches[active]) {
      e.preventDefault();
      choose(matches[active]);
    } else if (e.key === "Home" && open) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && open) {
      e.preventDefault();
      setActive(matches.length - 1);
    }
  };

  // Top-layer popover (matches the CSS) so the list escapes clipping ancestors.
  useEffect(() => {
    const list = listRef.current;
    if (!list || !open) return;
    const reposition = () => placeListbox(rootRef.current, list);
    list.showPopover();
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      if (list.matches(":popover-open")) list.hidePopover();
    };
  }, [open]);

  // Filtering changes the list height, so re-place it while open.
  useEffect(() => {
    if (listRef.current && open) placeListbox(rootRef.current, listRef.current);
  }, [query, open]);

  return (
    <div
      className="combobox"
      ref={rootRef}
      onBlur={(e) => {
        if (!rootRef.current.contains(e.relatedTarget)) setOpen(false);
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
          aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <span className="input__trailing combobox__chevron" aria-hidden="true">
          <IconChevronDown />
        </span>
      </div>
      <ul
        className="select__list"
        id={listId}
        role="listbox"
        tabIndex={-1}
        ref={listRef}
        popover="manual"
      >
        {matches.map((opt, i) => (
          <li
            key={opt}
            id={`${listId}-${i}`}
            className={["select__option", i === active && "is-active"].filter(Boolean).join(" ")}
            role="option"
            aria-selected={selected === opt}
            onMouseDown={(e) => e.preventDefault()}
            onMouseMove={() => setActive(i)}
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
