// Multi-line text field in the Input shell. `label` renders the field label; other props
// (rows, placeholder, disabled, value, onChange) pass through to the textarea.
export default function Textarea({ label, className, ...rest }) {
  return (
    <label className={["input", className].filter(Boolean).join(" ")}>
      {label && <span className="input__label">{label}</span>}
      <span className="input__container input__container--textarea">
        <textarea className="input__element" {...rest} />
      </span>
    </label>
  );
}
