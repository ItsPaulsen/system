import { useId } from "react";
import { IconAlertCircle } from "@tabler/icons-react";

// Single-select group of native radios. Options in a RadioGroup share one `name`, so exactly
// one is chosen; no JavaScript needed. `label` names the group (aria-label). Optional group-level
// `hint`/`error` wire to the group via aria-describedby, and `error` sets aria-invalid so the
// whole set is flagged, not one control. Props on Radio pass through to the input.
export function RadioGroup({ label, hint, error, invalid, children, className, ...rest }) {
  const id = useId();
  const isInvalid = invalid || Boolean(error);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div
      className={["radio-group", className].filter(Boolean).join(" ")}
      role="radiogroup"
      aria-label={label}
      aria-invalid={isInvalid || undefined}
      aria-describedby={describedBy}
      {...rest}
    >
      {children}
      {hint && !error && (
        <span className="radio-group__hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="radio-group__error" id={`${id}-error`}>
          <IconAlertCircle aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  );
}

export function Radio({ children, className, ...rest }) {
  return (
    <label className={["radio", className].filter(Boolean).join(" ")}>
      <input type="radio" className="radio__input" {...rest} />
      <span className="radio__label">{children}</span>
    </label>
  );
}
