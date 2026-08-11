// Placeholder for when there's nothing to show. Compose an icon, title, text, and actions.
export function Empty({ children, className, ...rest }) {
  return (
    <div className={["empty", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
}

export function EmptyIcon({ children, ...rest }) {
  return (
    <span className="empty__icon" aria-hidden="true" {...rest}>
      {children}
    </span>
  );
}

export function EmptyTitle({ children, ...rest }) {
  return (
    <h3 className="empty__title" {...rest}>
      {children}
    </h3>
  );
}

export function EmptyText({ children, ...rest }) {
  return (
    <p className="empty__text" {...rest}>
      {children}
    </p>
  );
}

export function EmptyActions({ children, ...rest }) {
  return (
    <div className="empty__actions" {...rest}>
      {children}
    </div>
  );
}
