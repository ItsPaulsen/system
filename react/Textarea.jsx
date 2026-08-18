import { useId } from "react";
import { IconAlertCircle } from "@tabler/icons-react";

// Multi-line text field in the Input shell, with the same optional hint/error wiring as Input.
// `invalid` is implied when `error` is set; other props (rows, placeholder, disabled, value,
// onChange) pass through to the textarea. Omit `label` only when you pass an aria-label.
export default function Textarea({ label, hint, error, invalid, required, className, ...rest }) {
  const id = useId();
  const isInvalid = invalid || Boolean(error);
  const containerCls = [
    "input__container",
    "input__container--textarea",
    isInvalid && "input__container--invalid"
  ]
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
        <textarea
          className="input__element"
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
