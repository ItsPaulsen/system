// Filter chip backed by a native radio or checkbox; the checked state and its checkmark are CSS.
// `as` picks the input type ("radio" | "checkbox"); other props pass through to the input.
export default function Chip({ as = "checkbox", children, className, ...rest }) {
  const cls = ["chip", `chip--as-${as}`, className].filter(Boolean).join(" ");
  return (
    <label className={cls}>
      <input type={as} className="chip__input" {...rest} />
      {children}
    </label>
  );
}
