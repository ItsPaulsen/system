// Indeterminate loading indicator. The arc is currentColor, so it inherits the text colour.
// `size` is "sm" | "lg"; `label` names it for assistive tech.
export default function Spinner({ size, label = "Loading", className, ...rest }) {
  const cls = ["spinner", size && `spinner--${size}`, className].filter(Boolean).join(" ");
  return <span className={cls} role="status" aria-label={label} {...rest} />;
}
