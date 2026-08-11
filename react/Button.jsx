import { forwardRef } from "react";

// Mirrors the vanilla Button. Skins come from `variant`; `size` sets the
// data-size density hook on the element itself (omit to inherit an ancestor's).
// `loading` holds the button's width while a spinner replaces the label. All
// styling lives in components.css + tokens.css — this only composes classes.
const SKINS = ["primary", "secondary", "flat", "destructive"];

const Button = forwardRef(function Button(
  {
    variant = "primary",
    size,
    loading = false,
    startIcon,
    endIcon,
    iconOnly = false,
    className,
    children,
    type = "button",
    ...rest
  },
  ref
) {
  const classes = [
    "button",
    SKINS.includes(variant) && `button--${variant}`,
    iconOnly && "button--icon",
    !iconOnly && startIcon && "button--with-start-icon",
    !iconOnly && endIcon && "button--with-end-icon",
    loading && "button--loading",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      data-size={size}
      // Block interaction without graying out (matches the vanilla loading spec).
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      {...rest}
    >
      {startIcon}
      {loading ? <span className="button__label">{children}</span> : children}
      {endIcon}
    </button>
  );
});

export default Button;
