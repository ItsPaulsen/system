import { IconUpload } from "@tabler/icons-react";

// File picker styled as a dashed dropzone. A transparent native <input type="file"> covers the
// whole box, so a click anywhere opens the picker and native drag-and-drop works with no JS; the
// wrapping label names the input. `title` is the prompt, `hint` an optional second line (omit for
// a compact zone), `buttonLabel` the Browse button. Other props (accept, multiple, disabled,
// onChange, name) pass through to the input.
export default function FileUpload({
  title = "Drop a file here or browse",
  hint,
  buttonLabel = "Browse files",
  className,
  ...rest
}) {
  return (
    <label className={["file-upload", className].filter(Boolean).join(" ")}>
      <input type="file" className="file-upload__input" {...rest} />
      <IconUpload className="file-upload__icon" aria-hidden="true" />
      <span className="file-upload__title">{title}</span>
      {hint && <span className="file-upload__hint">{hint}</span>}
      {buttonLabel && <span className="file-upload__button">{buttonLabel}</span>}
    </label>
  );
}
