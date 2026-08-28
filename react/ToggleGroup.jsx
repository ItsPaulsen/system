import { Fragment, useId, useState } from "react";

// Segmented control: a single choice styled as a track. Radios sharing a name make it mutually
// exclusive (CSS-only, no JS): it's a radiogroup, not tabs (no panels). `pill` fully rounds the
// track. `items` are { value, label, icon?, disabled? }. Uncontrolled via defaultValue; pass
// value + onChange to control it. `aria-label` names the group for assistive tech.
export default function ToggleGroup({
  items,
  name,
  value,
  defaultValue,
  onChange,
  pill,
  className,
  "aria-label": ariaLabel
}) {
  const auto = useId();
  const group = name || auto;
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? items[0]?.value);
  const selected = value ?? uncontrolled;
  const cls = ["toggle-group", pill && "toggle-group--pill", className].filter(Boolean).join(" ");

  return (
    <div className={cls} role="radiogroup" aria-label={ariaLabel}>
      {items.map((item) => {
        const id = `${group}-${item.value}`;
        return (
          <Fragment key={item.value}>
            <input
              type="radio"
              name={group}
              id={id}
              className="toggle-group__radio"
              checked={selected === item.value}
              disabled={item.disabled}
              onChange={() => {
                if (value === undefined) setUncontrolled(item.value);
                onChange?.(item.value);
              }}
            />
            <label className="toggle-group__tab" htmlFor={id}>
              {item.icon}
              <span className="toggle-group__label">{item.label}</span>
            </label>
          </Fragment>
        );
      })}
    </div>
  );
}
