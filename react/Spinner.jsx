// Indeterminate loading indicator. The arc is currentColor, so it inherits the text colour.
// `size` is "sm" | "lg"; `label` names it for assistive tech. Pass `label={null}` when the
// spinner sits inside an already-labelled control (e.g. a "Saving" button) so it stays silent
// instead of announcing the label twice.
export default function Spinner({ size, label = "Loading", className, ...rest }) {
  const cls = ["spinner", size && `spinner--${size}`, className].filter(Boolean).join(" ");
  const a11y = label ? { role: "status", "aria-label": label } : { "aria-hidden": "true" };
  return <span className={cls} {...a11y} {...rest} />;
}
