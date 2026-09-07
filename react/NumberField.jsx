import { useEffect, useId, useRef, useState } from "react";

// An <input> flanked by −/+ steppers: type a value or step it. Steps on click and
// Arrow Up/Down, press-and-hold repeats, clamps on blur, and disables a stepper at
// its bound. Uncontrolled via defaultValue, or pass value + onChange to control it.
// size is "sm" (32px) or "lg" (48px); default is 40px.
export default function NumberField({
  label,
  hint,
  value,
  defaultValue = 0,
  min = -Infinity,
  max = Infinity,
  step = 1,
  size,
  onChange,
  className,
  ...rest
}) {
  const id = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const current = value ?? uncontrolled;
  const hold = useRef({});
  // The repeat interval outlives the render that started it, so it reads the
  // value through a ref; closing over `current` would re-step from the same
  // base on every tick.
  const latest = useRef(current);
  latest.current = current;
  const clamp = (n) => Math.min(max, Math.max(min, n));
  const cls = ["input", "number-field", size && `number-field--${size}`, className]
    .filter(Boolean)
    .join(" ");

  const commit = (n) => {
    if (value === undefined) setUncontrolled(n);
    onChange?.(n);
  };
  const nudge = (dir) => {
    const n = parseFloat(latest.current);
    const base = Number.isNaN(n) ? (min > -Infinity ? min : 0) : n;
    const next = clamp(base + dir * step);
    latest.current = next;
    commit(next);
    return next;
  };

  // click does the single step; a held pointer layers repeat on top after a delay.
  const press = (dir, e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    hold.current.t = setTimeout(() => {
      // Stop at the bound instead of spinning on a stepper that just disabled.
      hold.current.i = setInterval(() => {
        const next = nudge(dir);
        if (dir < 0 ? next <= min : next >= max) release();
      }, 60);
    }, 400);
  };
  const release = () => {
    clearTimeout(hold.current.t);
    clearInterval(hold.current.i);
  };
  // A pointer released outside the button (or an unmount mid-press) would
  // otherwise leave the repeat running.
  useEffect(() => release, []);

  const onKeyDown = (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      nudge(1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      nudge(-1);
    }
  };

  return (
    <div className={cls}>
      {label && (
        <label className="input__label" htmlFor={id}>
          {label}
        </label>
      )}
      <span className="input__container number-field__control">
        <button
          type="button"
          className="number-field__step"
          aria-label="Decrease"
          disabled={!Number.isNaN(parseFloat(current)) && parseFloat(current) <= min}
          onPointerDown={(e) => press(-1, e)}
          onPointerUp={release}
          onPointerLeave={release}
          onPointerCancel={release}
          onClick={() => nudge(-1)}
        >
          <IconMinus />
        </button>
        <input
          id={id}
          className="input__element number-field__input"
          type="text"
          inputMode="numeric"
          value={current}
          onChange={(e) => {
            const v = e.target.value;
            if (v !== "" && Number(v) > max) return; // reject typing past max
            commit(v);
          }}
          onBlur={() => {
            const n = parseFloat(current);
            commit(Number.isNaN(n) ? (min > -Infinity ? min : "") : clamp(n));
          }}
          onKeyDown={onKeyDown}
          {...rest}
        />
        <button
          type="button"
          className="number-field__step"
          aria-label="Increase"
          disabled={!Number.isNaN(parseFloat(current)) && parseFloat(current) >= max}
          onPointerDown={(e) => press(1, e)}
          onPointerUp={release}
          onPointerLeave={release}
          onPointerCancel={release}
          onClick={() => nudge(1)}
        >
          <IconPlus />
        </button>
      </span>
      {hint && <span className="input__hint">{hint}</span>}
    </div>
  );
}

const IconMinus = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12l14 0" />
  </svg>
);

const IconPlus = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 5l0 14" />
    <path d="M5 12l14 0" />
  </svg>
);
