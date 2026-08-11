import { forwardRef } from "react";

// Composes the button classes; styling lives in components.css + globals.css.
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
