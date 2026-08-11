// Native <details> accordion; give items a shared `name` to make one-open-at-a-time exclusive.

export function Accordion({ children, className, ...rest }) {
  return (
    <div className={["accordion", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
}

export function AccordionItem({ children, className, ...rest }) {
  return (
    <details className={["accordion__item", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </details>
  );
}

export function AccordionTrigger({ children, className, ...rest }) {
  return (
    <summary className={["accordion__summary", className].filter(Boolean).join(" ")} {...rest}>
      {children}
      <span className="accordion__toggle" aria-hidden="true">
        <svg
          className="accordion__toggle-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12l14 0" />
          <path className="accordion__toggle-v" d="M12 5l0 14" />
        </svg>
      </span>
    </summary>
  );
}

export function AccordionContent({ children, className, ...rest }) {
  return (
    <div className={["accordion__body", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
}
