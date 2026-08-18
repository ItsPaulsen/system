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
      <span className="accordion__toggle" aria-hidden="true" />
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
