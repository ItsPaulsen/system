import { useState } from "react";

// Two-handle range: two overlaid native inputs, so each thumb keeps native keyboard and screen-reader behaviour. Handles clamp instead of crossing, and each travels a sub-track a thumb short of the bar, so equal values sit edge to edge.
export default function SliderRange({
  min = 0,
  max = 100,
  step,
  defaultValue = [min, max],
  value: controlled,
  minLabel = "Minimum",
  maxLabel = "Maximum",
  className,
  onChange,
  ...rest
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const [low, high] = controlled ?? uncontrolled;

  const span = max - min || 1;
  // Ratios, not percentages: the CSS turns these into thumb-centre positions,
  // since each input travels a sub-track a thumb short of the bar.
  const ratio = (v) => (v - min) / span;

  // Clamp rather than swap: swapping mid-drag would hand the gesture to the
  // other input, and the pointer would carry on moving a thumb it no longer
  // controls. Pushing to the neighbour's value keeps the grabbed thumb yours.
  const commit = (next) => {
    if (controlled === undefined) setUncontrolled(next);
    onChange?.(next);
  };

  const input = (which) => (
    <input
      className="slider-range__input"
      type="range"
      min={min}
      max={max}
      step={step}
      value={which === "lower" ? low : high}
      aria-label={which === "lower" ? minLabel : maxLabel}
      onChange={(e) => {
        const v = Number(e.target.value);
        commit(which === "lower" ? [Math.min(v, high), high] : [low, Math.max(v, low)]);
      }}
    />
  );

  return (
    <div
      className={["slider-range", className].filter(Boolean).join(" ")}
      style={{
        "--slider-range-from": String(ratio(low)),
        "--slider-range-to": String(ratio(high))
      }}
      {...rest}
    >
      {input("lower")}
      {input("upper")}
    </div>
  );
}
