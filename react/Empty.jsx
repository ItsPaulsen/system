// Placeholder for when there's nothing to show. Compose an icon, title, text, and actions.
export function Empty({ children, ...rest }) {
  return (
    <div className="empty" {...rest}>
      {children}
    </div>
  );
}

export function EmptyIcon({ children }) {
  return (
    <span className="empty__icon" aria-hidden="true">
      {children}
    </span>
  );
}

export function EmptyTitle({ children }) {
  return <h3 className="empty__title">{children}</h3>;
}

export function EmptyText({ children }) {
  return <p className="empty__text">{children}</p>;
}

export function EmptyActions({ children }) {
  return <div className="empty__actions">{children}</div>;
}
