import { useId, useRef, useState } from "react";

// An <input> flanked by −/+ steppers: type a value or step it. Steps on click and
// Arrow Up/Down, press-and-hold repeats, clamps on blur, and disables a stepper at
// its bound. Uncontrolled via defaultValue, or pass value + onChange to control it.
export default function NumberField({
  label,
  hint,
  value,
  defaultValue = 0,
  min = -Infinity,
  max = Infinity,
  step = 1,
  onChange,
  className,
  ...rest
}) {
  const id = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const current = value ?? uncontrolled;
  const hold = useRef({});
  const clamp = (n) => Math.min(max, Math.max(min, n));
  const cls = ["input", "number-field", className].filter(Boolean).join(" ");

  const commit = (n) => {
    if (value === undefined) setUncontrolled(n);
    onChange?.(n);
  };
  const nudge = (dir) => {
    const base = Number.isNaN(parseFloat(current)) ? (min > -Infinity ? min : 0) : Number(current);
    commit(clamp(base + dir * step));
  };

  // Press-and-hold repeat; the trailing click is swallowed via the ref flag.
  const press = (dir) => {
    hold.current.via = true;
    nudge(dir);
    hold.current.t = setTimeout(() => {
      hold.current.i = setInterval(() => nudge(dir), 60);
    }, 400);
  };
  const release = () => {
    clearTimeout(hold.current.t);
    clearInterval(hold.current.i);
  };
  const click = (dir) => {
    if (hold.current.via) {
      hold.current.via = false;
      return;
    }
    nudge(dir);
  };

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
    <label className={cls} htmlFor={id}>
      {label && <span className="input__label">{label}</span>}
      <span className="input__container number-field__control">
        <button
          type="button"
          className="number-field__step"
          aria-label="Decrease"
          disabled={Number(current) <= min}
          onPointerDown={() => press(-1)}
          onPointerUp={release}
          onPointerLeave={release}
          onPointerCancel={release}
          onClick={() => click(-1)}
        >
          <IconMinus />
        </button>
        <input
          id={id}
          className="input__element number-field__input"
          type="text"
          inputMode="numeric"
          value={current}
          onChange={(e) => commit(e.target.value)}
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
          disabled={Number(current) >= max}
          onPointerDown={() => press(1)}
          onPointerUp={release}
          onPointerLeave={release}
          onPointerCancel={release}
          onClick={() => click(1)}
        >
          <IconPlus />
        </button>
      </span>
      {hint && <span className="input__hint">{hint}</span>}
    </label>
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
