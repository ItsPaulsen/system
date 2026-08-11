// Native <details> accordion; give items a shared `name` to make one-open-at-a-time exclusive.

export function Accordion({ children, ...rest }) {
  return (
    <div className="accordion" {...rest}>
      {children}
    </div>
  );
}

export function AccordionItem({ children, ...rest }) {
  return (
    <details className="accordion__item" {...rest}>
      {children}
    </details>
  );
}

export function AccordionTrigger({ children, ...rest }) {
  return (
    <summary className="accordion__summary" {...rest}>
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

export function AccordionContent({ children, ...rest }) {
  return (
    <div className="accordion__body" {...rest}>
      {children}
    </div>
  );
}
