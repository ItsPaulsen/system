// Numbered progress through a linear flow. Pass the step labels and the active index
// (0-based); earlier steps render as done, the active one as current, later ones plain.
export default function Steps({ steps, current = 0, className }) {
  return (
    <ol className={["steps", className].filter(Boolean).join(" ")}>
      {steps.map((label, i) => {
        const state = i < current ? "is-done" : i === current ? "is-current" : "";
        return (
          <li
            key={label}
            className={["steps__step", state].filter(Boolean).join(" ")}
            aria-current={i === current ? "step" : undefined}
          >
            <span className="steps__indicator">
              <span className="steps__num">{i + 1}</span>
            </span>
            <span className="steps__label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
