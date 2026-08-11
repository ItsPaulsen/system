// Hairline rule between content. Horizontal renders a semantic <hr>; vertical renders a div
// with role="separator" (an <hr> can't be vertical). Spacing comes from the surrounding layout.
export default function Separator({ orientation = "horizontal", className, ...rest }) {
  if (orientation === "vertical") {
    return (
      <div
        className={["separator", "separator--vertical", className].filter(Boolean).join(" ")}
        role="separator"
        aria-orientation="vertical"
        {...rest}
      />
    );
  }
  return <hr className={["separator", className].filter(Boolean).join(" ")} {...rest} />;
}
