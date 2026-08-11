// Breadcrumb trail. The last crumb is BreadcrumbPage (plain text, aria-current), the rest are links.
// Separators are drawn in CSS, so there's no separator element to render.
export function Breadcrumb({ children, ...rest }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb" {...rest}>
      <ol className="breadcrumb__list">{children}</ol>
    </nav>
  );
}

export function BreadcrumbItem({ children, ...rest }) {
  return (
    <li className="breadcrumb__item" {...rest}>
      {children}
    </li>
  );
}

export function BreadcrumbLink({ children, ...rest }) {
  return (
    <a className="breadcrumb__link" {...rest}>
      {children}
    </a>
  );
}

export function BreadcrumbPage({ children, ...rest }) {
  return (
    <span className="breadcrumb__current" aria-current="page" {...rest}>
      {children}
    </span>
  );
}
