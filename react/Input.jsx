import { useId, useState } from "react";
import { IconAlertCircle } from "@tabler/icons-react";

// Single-line text field with a label and optional hint or error. Container modifiers map to
// props: fill, rounded, invalid (invalid is implied when `error` is set, or when `maxCount` is
// exceeded). `leading`/`trailing` are decorative slots (an icon or short text); interactive
// add-ons compose in the markup. `maxCount` adds a live character counter.
export default function Input({
  label,
  hint,
  error,
  invalid,
  fill,
  rounded,
  required,
  leading,
  trailing,
  maxCount,
  type = "text",
  className,
  value,
  defaultValue,
  onChange,
  ...rest
}) {
  const id = useId();
  // Counter derives from `value` when controlled, else tracks uncontrolled edits.
  const isControlled = value !== undefined;
  const [innerCount, setInnerCount] = useState(String(defaultValue ?? "").length);
  const count = isControlled ? String(value ?? "").length : innerCount;
  const overLimit = maxCount != null && count > maxCount;
  const isInvalid = invalid || Boolean(error) || overLimit;
  const containerCls = [
    "input__container",
    fill && "input__container--fill",
    rounded && "input__container--rounded",
    isInvalid && "input__container--invalid"
  ]
    .filter(Boolean)
    .join(" ");
  const elementCls = ["input__element", type === "file" && "input__element--file"]
    .filter(Boolean)
    .join(" ");
  const describedBy =
    [error ? `${id}-error` : hint ? `${id}-hint` : null, maxCount != null ? `${id}-count` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const handleChange = (e) => {
    if (maxCount != null && !isControlled) setInnerCount(e.target.value.length);
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
        {leading && (
          <span className="input__leading" aria-hidden="true">
            {leading}
          </span>
        )}
        <input
          className={elementCls}
          type={type}
          required={required}
          {...(isControlled ? { value } : { defaultValue })}
          onChange={handleChange}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {trailing && (
          <span className="input__trailing" aria-hidden="true">
            {trailing}
          </span>
        )}
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
