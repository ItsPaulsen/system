// Small status/label pill. `variant` picks a style (primary | secondary | outline) or a
// colour tint (amber | blue | fuchsia | green | red); startIcon/endIcon slot a leading/trailing glyph.
export default function Badge({ variant, startIcon, endIcon, children, className, ...rest }) {
  const cls = [
    "badge",
    variant && `badge--${variant}`,
    startIcon && "badge--with-start-icon",
    endIcon && "badge--with-end-icon",
    className
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      {startIcon}
      {children}
      {endIcon}
    </span>
  );
}
