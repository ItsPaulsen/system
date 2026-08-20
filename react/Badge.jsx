import { cloneElement, isValidElement } from "react";

// Small status/label pill. `variant` picks a style (primary | neutral | secondary | outline) or a
// colour tint (amber | blue | fuchsia | green | red); startIcon/endIcon slot a leading/trailing glyph.
// `primary` reads --accent (brand by default, retints in a data-color region); `neutral` is fixed solid ink.
// Icons are decorative (the badge's text carries the meaning), so they're marked aria-hidden.
const decorative = (icon) =>
  isValidElement(icon) ? cloneElement(icon, { "aria-hidden": "true" }) : icon;

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
      {decorative(startIcon)}
      {children}
      {decorative(endIcon)}
    </span>
  );
}
