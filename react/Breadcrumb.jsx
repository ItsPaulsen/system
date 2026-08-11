// Breadcrumb trail. The last crumb is BreadcrumbPage (plain text, aria-current), the rest are links.
// Separators are drawn in CSS, so there's no separator element to render.
export function Breadcrumb({ children, className, ...rest }) {
  return (
    <nav
      className={["breadcrumb", className].filter(Boolean).join(" ")}
      aria-label="Breadcrumb"
      {...rest}
    >
      <ol className="breadcrumb__list">{children}</ol>
    </nav>
  );
}

export function BreadcrumbItem({ children, className, ...rest }) {
  return (
    <li className={["breadcrumb__item", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </li>
  );
}

export function BreadcrumbLink({ children, className, ...rest }) {
  return (
    <a className={["breadcrumb__link", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </a>
  );
}

export function BreadcrumbPage({ children, className, ...rest }) {
  return (
    <span
      className={["breadcrumb__current", className].filter(Boolean).join(" ")}
      aria-current="page"
      {...rest}
    >
      {children}
    </span>
  );
}
