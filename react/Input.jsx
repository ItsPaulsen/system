import { useId } from "react";
import { IconAlertCircle } from "@tabler/icons-react";

// Single-line text field with a label and optional hint or error. Container modifiers map to
// props: fill, rounded, invalid (invalid is implied when `error` is set).
export default function Input({
  label,
  hint,
  error,
  invalid,
  fill,
  rounded,
  required,
  type = "text",
  className,
  ...rest
}) {
  const id = useId();
  const isInvalid = invalid || Boolean(error);
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
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

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
        <input
          className={elementCls}
          type={type}
          required={required}
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
    </label>
  );
}
