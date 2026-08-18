import { useEffect, useMemo, useRef, useState } from "react";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
// Full names for the columnheaders' aria-label (the visible text is abbreviated).
const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const same = (a, b) => a && b && iso(a) === iso(b);
const parse = (s) => {
  const d = s && new Date(`${s}T00:00:00`);
  return d && !Number.isNaN(d.getTime()) ? d : null;
};
// Weekday index with Monday as 0 (JS getDay() has Sunday as 0).
const mondayIndex = (d) => (d.getDay() + 6) % 7;

// Month grid for choosing a date, capped at 31 Dec of the current year. Uncontrolled via
// defaultValue; pass value + onSelect (both ISO "yyyy-mm-dd") to control it. Keyboard nav:
// arrows, Home/End, PageUp/PageDown, Enter/Space.
export default function Calendar({ value, defaultValue, onSelect }) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const maxYear = today.getFullYear();
  const maxDate = useMemo(() => new Date(maxYear, 11, 31), [maxYear]);
  // Floor a decade back, matching the year dropdown; days before it aren't shown.
  const minDate = useMemo(() => new Date(maxYear - 10, 0, 1), [maxYear]);

  const [uncontrolled, setUncontrolled] = useState(() => parse(defaultValue));
  const selected = value !== undefined ? parse(value) : uncontrolled;

  const [view, setView] = useState(() => {
    const base = selected || today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  // Roving focus: after a keyboard move re-renders the grid, focus the new day.
  const [pendingFocus, setPendingFocus] = useState(null);
  const daysRef = useRef(null);
  useEffect(() => {
    if (!pendingFocus) return;
    daysRef.current?.querySelector(`[data-date="${pendingFocus}"]`)?.focus();
    setPendingFocus(null);
  }, [pendingFocus, view]);

  const years = useMemo(() => {
    const set = new Set();
    for (let y = maxYear - 10; y <= maxYear; y += 1) set.add(y);
    if (view.getFullYear() <= maxYear) set.add(view.getFullYear());
    return [...set].sort((a, b) => a - b);
  }, [maxYear, view]);

  const pick = (d) => {
    if (d > maxDate) return;
    if (value === undefined) setUncontrolled(d);
    onSelect?.(iso(d));
  };

  const roam = (d) => {
    if (d > maxDate || d < minDate) return;
    if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) {
      setView(new Date(d.getFullYear(), d.getMonth(), 1));
    }
    setPendingFocus(iso(d));
  };

  const onKeyDown = (e) => {
    const btn = e.target.closest(".calendar__day");
    if (!btn?.dataset.date) return;
    const cur = parse(btn.dataset.date);
    const dow = mondayIndex(cur);
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const shift = (days) => {
      const n = new Date(cur);
      n.setDate(cur.getDate() + days);
      roam(n);
    };
    if (e.key in moves) shift(moves[e.key]);
    else if (e.key === "Home") shift(-dow);
    else if (e.key === "End") shift(6 - dow);
    else if (e.key === "PageUp")
      roam(new Date(cur.getFullYear(), cur.getMonth() - 1, cur.getDate()));
    else if (e.key === "PageDown")
      roam(new Date(cur.getFullYear(), cur.getMonth() + 1, cur.getDate()));
    else if (e.key === "Enter" || e.key === " ") pick(cur);
    else return;
    e.preventDefault();
  };

  // 42-cell grid from the Monday before the 1st; trim any spill past the cap.
  const startDow = mondayIndex(new Date(view.getFullYear(), view.getMonth(), 1));
  const gridStart = new Date(view.getFullYear(), view.getMonth(), 1 - startDow);
  const days = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    if (d > maxDate) break;
    days.push(d);
  }
  // One tabbable cell: the selected day if it falls in the shown month, else the
  // first of this month. Must be an in-month day, since outside days are inert
  // divs now (a spillover selected day would leave the grid with no tab stop).
  const tabbable =
    (selected && days.find((d) => same(d, selected) && d.getMonth() === view.getMonth())) ||
    days.find((d) => d.getMonth() === view.getMonth());

  // Chunk into weeks so each renders as a role="row" of 7 gridcells.
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const gridLabel = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  // Announce month/year changes via a live region (a grid's aria-label change
  // isn't spoken on its own). Compare against the previous label so it stays quiet
  // on mount and only speaks on an actual change.
  const [announce, setAnnounce] = useState("");
  const prevLabel = useRef(gridLabel);
  useEffect(() => {
    if (prevLabel.current !== gridLabel) {
      setAnnounce(gridLabel);
      prevLabel.current = gridLabel;
    }
  }, [gridLabel]);

  const setMonth = (m) => setView(new Date(view.getFullYear(), m, 1));
  const setYear = (y) => setView(new Date(y, view.getMonth(), 1));

  return (
    <div className="calendar">
      <div className="sr-only" role="status">
        {announce}
      </div>
      <div className="calendar__head">
        <button
          className="calendar__nav"
          type="button"
          aria-label="Previous month"
          disabled={new Date(view.getFullYear(), view.getMonth(), 1) <= minDate}
          onClick={() => setMonth(view.getMonth() - 1)}
        >
          <Chevron d="M15 6l-6 6l6 6" />
        </button>
        <button
          className="calendar__nav"
          type="button"
          aria-label="Next month"
          disabled={new Date(view.getFullYear(), view.getMonth() + 1, 1) > maxDate}
          onClick={() => setMonth(view.getMonth() + 1)}
        >
          <Chevron d="M9 6l6 6l-6 6" />
        </button>
        <div className="calendar__period">
          <span className="calendar__select">
            <select
              aria-label="Month"
              value={view.getMonth()}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </span>
          <span className="calendar__select">
            <select
              aria-label="Year"
              value={view.getFullYear()}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </span>
        </div>
      </div>
      <div
        className="calendar__days"
        role="grid"
        aria-label={gridLabel}
        ref={daysRef}
        onKeyDown={onKeyDown}
        onClick={(e) => {
          const btn = e.target.closest(".calendar__day");
          if (btn?.dataset.date) pick(parse(btn.dataset.date));
        }}
      >
        <div className="calendar__weekdays" role="row">
          {WEEKDAYS.map((w, i) => (
            <span
              key={w}
              className="calendar__weekday"
              role="columnheader"
              aria-label={WEEKDAY_LABELS[i]}
            >
              {w}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={iso(week[0])} className="calendar__week" role="row">
            {week.map((d) => {
              // Leading days before the floor hold their column but stay blank.
              if (d < minDate)
                return <div key={iso(d)} className="calendar__day is-empty" aria-hidden="true" />;
              // Neighbouring-month days show their number but are inert (not a
              // button, not focusable/clickable), so selection stays in-month.
              if (d.getMonth() !== view.getMonth())
                return (
                  <div key={iso(d)} className="calendar__day is-outside" aria-hidden="true">
                    {d.getDate()}
                  </div>
                );
              const isToday = same(d, today);
              const isSelected = same(d, selected);
              const cls = ["calendar__day", isToday && "is-today", isSelected && "is-selected"]
                .filter(Boolean)
                .join(" ");
              // gridcell is a wrapper; the focusable day is a plain <button> inside,
              // so VoiceOver reads the focused button (one day), not into the grid.
              return (
                <div
                  key={iso(d)}
                  className="calendar__cell"
                  role="gridcell"
                  aria-selected={isSelected}
                >
                  <button
                    type="button"
                    className={cls}
                    data-date={iso(d)}
                    aria-label={d.toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                    aria-current={isToday ? "date" : undefined}
                    tabIndex={same(d, tabbable) ? 0 : -1}
                  >
                    {d.getDate()}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Chevron({ d }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
