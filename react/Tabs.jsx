import { useId, useRef, useState } from "react";

// Tabbed panels: one panel shown at a time, switched by a tablist. Real ARIA tabs
// (tablist/tab/tabpanel) with roving tabindex and arrow-key nav, unlike the radio-based
// ToggleGroup (which picks a value, no panels). `items` are { value, label, icon?, disabled?,
// panel }. Uncontrolled via defaultValue; pass value + onChange to control it. `aria-label`
// names the tablist. Activation follows focus (arrows move and select, the APG default).
export default function Tabs({
  items,
  value,
  defaultValue,
  onChange,
  className,
  "aria-label": ariaLabel
}) {
  const base = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? items[0]?.value);
  const selected = value ?? uncontrolled;
  const tabRefs = useRef([]);
  const cls = ["tabs", className].filter(Boolean).join(" ");

  const select = (val) => {
    if (value === undefined) setUncontrolled(val);
    onChange?.(val);
  };

  // Arrow/Home/End move to the next enabled tab and activate it (focus follows).
  const onKeyDown = (e) => {
    const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);
    const here = enabled.indexOf(items.findIndex((it) => it.value === selected));
    let next;
    if (e.key === "ArrowRight" || e.key === "ArrowDown")
      next = enabled[(here + 1) % enabled.length];
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = enabled[(here - 1 + enabled.length) % enabled.length];
    else if (e.key === "Home") next = enabled[0];
    else if (e.key === "End") next = enabled[enabled.length - 1];
    else return;
    e.preventDefault();
    select(items[next].value);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className={cls}>
      <div className="tabs__list" role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown}>
        {items.map((item, i) => {
          const isSel = item.value === selected;
          return (
            <button
              key={item.value}
              ref={(el) => (tabRefs.current[i] = el)}
              type="button"
              role="tab"
              id={`${base}-tab-${item.value}`}
              className="tabs__tab"
              aria-controls={`${base}-panel-${item.value}`}
              aria-selected={isSel}
              tabIndex={isSel ? 0 : -1}
              disabled={item.disabled}
              onClick={() => select(item.value)}
            >
              {item.icon}
              <span className="tabs__label">{item.label}</span>
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.value}
          role="tabpanel"
          id={`${base}-panel-${item.value}`}
          className="tabs__panel"
          aria-labelledby={`${base}-tab-${item.value}`}
          tabIndex={0}
          hidden={item.value !== selected}
        >
          {item.panel}
        </div>
      ))}
    </div>
  );
}
