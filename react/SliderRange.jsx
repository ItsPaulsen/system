import { useState } from "react";

// Two-handle range: two stacked native inputs, so each thumb keeps native keyboard and screen-reader behaviour. Handles clamp instead of crossing.
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
  // Which input was grabbed last. Both handles at one end would bury one under
  // the other, so the last one touched is raised and can be dragged back out.
  const [onTop, setOnTop] = useState("upper");

  const span = max - min || 1;
  const pct = (v) => `${((v - min) / span) * 100}%`;

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
      data-on-top={onTop === which ? "" : undefined}
      onPointerDown={() => setOnTop(which)}
      onChange={(e) => {
        const v = Number(e.target.value);
        commit(which === "lower" ? [Math.min(v, high), high] : [low, Math.max(v, low)]);
      }}
    />
  );

  return (
    <div
      className={["slider-range", className].filter(Boolean).join(" ")}
      style={{ "--slider-range-from": pct(low), "--slider-range-to": pct(high) }}
      {...rest}
    >
      {input("lower")}
      {input("upper")}
    </div>
  );
}
