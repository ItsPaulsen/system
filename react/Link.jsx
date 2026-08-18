// Styled text link. `cta` makes it a standalone next-step link with an arrow that
// grows out of the text on hover. `target="_blank"` gets safe rel + an sr-only
// "(opens in new tab)" so screen-reader users are warned the context will change.
export default function Link({ cta, children, className, target, rel, ...rest }) {
  const cls = ["link", cta && "link--cta", className].filter(Boolean).join(" ");
  const newTab = target === "_blank";
  return (
    <a
      className={cls}
      target={target}
      rel={newTab ? (rel ?? "noopener noreferrer") : rel}
      {...rest}
    >
      {children}
      {newTab && <span className="sr-only"> (opens in new tab)</span>}
      {cta && (
        <svg className="link-arrow" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            className="link-arrow__line"
            d="M1.5 6h8"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g className="link-arrow__chevron">
            <path
              d="M3.5 2l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      )}
    </a>
  );
}
