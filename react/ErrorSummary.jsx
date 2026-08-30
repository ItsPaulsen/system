import { useEffect, useId, useRef } from "react";

// Post-submit summary of form errors: a labelled danger box listing each error as a link to its
// field. Focuses itself when it appears (tabindex=-1 + aria-labelledby the heading) so a screen reader
// announces it the moment it appears after a failed submit; each link moves focus to the field it
// names. `errors` are { id, message } where id is the target field's id. Renders nothing when
// there are no errors, so you can mount it unconditionally with the current error list.
export default function ErrorSummary({ errors, heading = "There is a problem", className }) {
  const ref = useRef(null);
  const headingId = useId();

  // Focus whenever the error set appears or changes, so a resubmit re-announces it.
  useEffect(() => {
    if (errors?.length) ref.current?.focus();
  }, [errors?.length]);

  if (!errors?.length) return null;

  const focusField = (e, id) => {
    const field = document.getElementById(id);
    if (!field) return;
    e.preventDefault();
    field.scrollIntoView({ block: "center", behavior: "smooth" });
    field.focus();
  };

  return (
    <div
      ref={ref}
      className={["error-summary", className].filter(Boolean).join(" ")}
      tabIndex={-1}
      aria-labelledby={headingId}
    >
      <p className="error-summary__title" id={headingId}>
        {heading}
      </p>
      <ul className="error-summary__list">
        {errors.map((err) => (
          <li key={err.id}>
            <a
              className="error-summary__link"
              href={`#${err.id}`}
              onClick={(e) => focusField(e, err.id)}
            >
              {err.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
