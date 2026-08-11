// Native <select> in the Input shell: the platform picker and keyboard stay, only the arrow is
// restyled. Children are the <option>/<optgroup> list; other props pass through to the select.
export default function NativeSelect({ label, children, className, ...rest }) {
  return (
    <label className={["input", className].filter(Boolean).join(" ")}>
      {label && <span className="input__label">{label}</span>}
      <span className="input__container input__container--select">
        <select className="input__element" {...rest}>
          {children}
        </select>
      </span>
    </label>
  );
}
