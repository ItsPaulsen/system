// Native checkbox with a tick that strokes itself on. Props pass through to the input
// (checked, defaultChecked, disabled, onChange, name, value). Children are the label.
export default function Checkbox({ children, className, ...rest }) {
  const cls = ["checkbox", className].filter(Boolean).join(" ");
  return (
    <label className={cls}>
      <span className="checkbox__box">
        <input type="checkbox" className="checkbox__input" {...rest} />
        <svg
          className="checkbox__check"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12l5 5l10 -10" pathLength="1" />
        </svg>
      </span>
      {children && <span className="checkbox__label">{children}</span>}
    </label>
  );
}
