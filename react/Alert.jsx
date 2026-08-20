import {
  IconInfoCircle,
  IconCircleCheck,
  IconAlertTriangle,
  IconAlertCircle
} from "@tabler/icons-react";

// Inline status message; the variant picks the surface, icon, and live-region role.
// `accent` is a non-semantic callout that follows the data-color region.
const ICON = {
  info: IconInfoCircle,
  success: IconCircleCheck,
  warning: IconAlertTriangle,
  error: IconAlertCircle,
  accent: IconInfoCircle
};

export default function Alert({ variant = "info", title, children, className, ...rest }) {
  const Icon = ICON[variant];
  return (
    <div
      className={["alert", `alert--${variant}`, className].filter(Boolean).join(" ")}
      role={variant === "error" ? "alert" : "status"}
      {...rest}
    >
      <Icon className="alert__icon" aria-hidden="true" />
      <div className="alert__body">
        {title && <p className="alert__title">{title}</p>}
        <p className="alert__text">{children}</p>
      </div>
    </div>
  );
}
