// Binary on/off control on a native checkbox, so it works in forms and with screen readers.
// Props pass through to the input; children are the label.
export default function Switch({ children, className, ...rest }) {
  return (
    <label className={["switch", className].filter(Boolean).join(" ")}>
      <span className="switch__input-wrapper">
        <input type="checkbox" className="switch__input" {...rest} />
        <span className="switch__knob" />
      </span>
      {children && <span className="switch__label">{children}</span>}
    </label>
  );
}
