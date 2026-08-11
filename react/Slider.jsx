import { useState } from "react";

// Native range input; fill width tracks the value via --slider-fill. Uncontrolled unless you pass value + onChange.
export default function Slider({
  label,
  value: controlled,
  defaultValue = 0,
  min = 0,
  max = 100,
  step,
  showValue = true,
  className,
  id,
  onChange,
  ...rest
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = controlled ?? uncontrolled;
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

  const input = (
    <input
      type="range"
      id={id}
      className={["slider", className].filter(Boolean).join(" ")}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => {
        if (controlled === undefined) setUncontrolled(Number(e.target.value));
        onChange?.(e);
      }}
      style={{ "--slider-fill": `${pct}%` }}
      {...rest}
    />
  );

  if (!label && !showValue) return input;

  return (
    <div className="slider-field">
      <div className="slider-field__header">
        {label && (
          <label className="slider-field__label" htmlFor={id}>
            {label}
          </label>
        )}
        {showValue && (
          <output className="slider-field__value" htmlFor={id}>
            {value}
          </output>
        )}
      </div>
      {input}
    </div>
  );
}
