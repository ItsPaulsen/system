// Interactive surface. Renders an <a> when given href, else a <button>; always pair it
// with an image, illustration, or icon. Modifiers: --horizontal --alternate --stretch-image.
export function Card({ href, className, children, ...rest }) {
  const cls = ["card", className].filter(Boolean).join(" ");
  const Tag = href ? "a" : "button";
  return (
    <Tag className={cls} href={href} type={href ? undefined : "button"} {...rest}>
      {children}
    </Tag>
  );
}

export function CardImage(props) {
  return <img className="card__image" alt="" {...props} />;
}

export function CardIllustration({ children, ...rest }) {
  return (
    <div className="card__illustration" {...rest}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...rest }) {
  const cls = ["card__content", className].filter(Boolean).join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ children, ...rest }) {
  return (
    <h2 className="card__title" {...rest}>
      {children}
    </h2>
  );
}
