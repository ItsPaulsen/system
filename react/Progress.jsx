// Native <progress> for measurable completion. Set value + max and report a label with
// aria-label; the element exposes both to assistive tech. Props pass through.
export default function Progress({ className, ...rest }) {
  return <progress className={["progress", className].filter(Boolean).join(" ")} {...rest} />;
}
