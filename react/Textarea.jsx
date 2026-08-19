import { useId, useState } from "react";
import { IconAlertCircle } from "@tabler/icons-react";

// Multi-line text field in the Input shell, with the same optional hint/error wiring as Input.
// `invalid` is implied when `error` is set or `maxCount` is exceeded; `maxCount` adds a live
// character counter. Other props (rows, placeholder, disabled, value, onChange) pass through to
// the textarea. Omit `label` only when you pass an aria-label.
export default function Textarea({
  label,
  hint,
  error,
  invalid,
  required,
  maxCount,
  className,
  value,
  defaultValue,
  onChange,
  ...rest
}) {
  const id = useId();
  const [count, setCount] = useState(String(value ?? defaultValue ?? "").length);
  const overLimit = maxCount != null && count > maxCount;
  const isInvalid = invalid || Boolean(error) || overLimit;
  const containerCls = [
    "input__container",
    "input__container--textarea",
    isInvalid && "input__container--invalid"
  ]
    .filter(Boolean)
    .join(" ");
  const describedBy =
    [error ? `${id}-error` : hint ? `${id}-hint` : null, maxCount != null ? `${id}-count` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const handleChange = (e) => {
    if (maxCount != null) setCount(e.target.value.length);
    onChange?.(e);
  };

  return (
    <label className={["input", className].filter(Boolean).join(" ")}>
      {label && (
        <span className="input__label">
          {label}
          {required && (
            <span className="input__label-required" aria-hidden="true">
              *
            </span>
          )}
        </span>
      )}
      <span className={containerCls}>
        <textarea
          className="input__element"
          required={required}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      </span>
      {hint && !error && (
        <span className="input__hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="input__error" id={`${id}-error`}>
          <IconAlertCircle aria-hidden="true" />
          {error}
        </span>
      )}
      {maxCount != null && (
        <span
          className={["input__count", overLimit && "input__count--over"].filter(Boolean).join(" ")}
          id={`${id}-count`}
        >
          {count}/{maxCount}
        </span>
      )}
    </label>
  );
}
