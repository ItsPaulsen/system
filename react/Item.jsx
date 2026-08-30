// Compact horizontal row: media + content (title/description) + actions. Where Card is a
// standalone surface, Item is the repeating line you stack into a list. Renders an <a> when
// given href, a <button> with onClick, else a <div>. Variants: "outline" | "muted".
export function Item({ href, onClick, variant, className, children, ...rest }) {
  const cls = ["item", variant && `item--${variant}`, className].filter(Boolean).join(" ");
  const Tag = href ? "a" : onClick ? "button" : "div";
  return (
    <Tag
      className={cls}
      href={href}
      onClick={onClick}
      type={Tag === "button" ? "button" : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function ItemMedia({ className, children, ...rest }) {
  const cls = ["item__media", className].filter(Boolean).join(" ");
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}

export function ItemContent({ className, children, ...rest }) {
  const cls = ["item__content", className].filter(Boolean).join(" ");
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}

export function ItemTitle({ children, ...rest }) {
  return (
    <span className="item__title" {...rest}>
      {children}
    </span>
  );
}

export function ItemDescription({ children, ...rest }) {
  return (
    <span className="item__description" {...rest}>
      {children}
    </span>
  );
}

export function ItemActions({ className, children, ...rest }) {
  const cls = ["item__actions", className].filter(Boolean).join(" ");
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}

export function ItemGroup({ variant, className, children, ...rest }) {
  const cls = ["item-group", variant && `item-group--${variant}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export function ItemSeparator() {
  return <hr className="item-separator" />;
}
