// Single-select group of native radios. Options in a RadioGroup share one `name`, so exactly
// one is chosen; no JavaScript needed. Props on Radio pass through to the input.
export function RadioGroup({ label, children, ...rest }) {
  return (
    <div className="radio-group" role="radiogroup" aria-label={label} {...rest}>
      {children}
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
