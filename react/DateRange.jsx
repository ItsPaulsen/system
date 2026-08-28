import { useEffect, useMemo, useRef, useState } from "react";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const same = (a, b) => a && b && iso(a) === iso(b);
const parse = (s) => {
  const d = s && new Date(`${s}T00:00:00`);
  return d && !Number.isNaN(d.getTime()) ? d : null;
};
const mondayIndex = (d) => (d.getDay() + 6) % 7;

// Two-month range picker. Uncontrolled via defaultStart/defaultEnd; pass start + end +
// onChange (all ISO "yyyy-mm-dd") to control it. First click sets the start, the next the
// end (swapping if earlier); a click after a full range starts over. Hover previews the band.
export default function DateRange({ defaultStart, defaultEnd, onChange, onApply, onCancel }) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const maxYear = today.getFullYear();
  const maxDate = useMemo(() => new Date(maxYear, 11, 31), [maxYear]);
  const minDate = useMemo(() => new Date(maxYear - 10, 0, 1), [maxYear]);

  // Selection is staged: picks update `range`, Apply commits it (fires onChange),
  // Cancel reverts to `committed`, Clear empties it.
  const [range, setRange] = useState(() => ({
    start: parse(defaultStart),
    end: parse(defaultEnd)
  }));
  const [committed, setCommitted] = useState(range);
  const value = range;
  const [previewEnd, setPreviewEnd] = useState(null);

  const [view, setView] = useState(() => {
    const b = value.start || today;
    return new Date(b.getFullYear(), b.getMonth(), 1);
  });

  const [pendingFocus, setPendingFocus] = useState(null);
  const rootRef = useRef(null);
  useEffect(() => {
    if (!pendingFocus) return;
    rootRef.current?.querySelector(`[data-date="${pendingFocus}"]`)?.focus();
    setPendingFocus(null);
  }, [pendingFocus, view]);

  const pick = (d) => {
    if (d < minDate || d > maxDate) return;
    setPreviewEnd(null);
    if (!value.start || (value.start && value.end)) setRange({ start: d, end: null });
    else if (d < value.start) setRange({ start: d, end: value.start });
    else setRange({ start: value.start, end: d });
  };

  const clearRange = () => {
    setPreviewEnd(null);
    setRange({ start: null, end: null });
  };
  const cancel = () => {
    setPreviewEnd(null);
    setRange(committed);
    onCancel?.();
  };
  const apply = () => {
    if (!(value.start && value.end)) return;
    setCommitted(value);
    onChange?.({ start: iso(value.start), end: iso(value.end) });
    onApply?.();
  };

  const roam = (d) => {
    if (d < minDate || d > maxDate) return;
    // Move view only when the target falls outside the two shown months.
    const inView = (mDate) =>
      (d.getFullYear() === mDate.getFullYear() && d.getMonth() === mDate.getMonth()) ||
      (d.getFullYear() === mDate.getFullYear() && d.getMonth() === mDate.getMonth() + 1) ||
      (mDate.getMonth() === 11 &&
        d.getFullYear() === mDate.getFullYear() + 1 &&
        d.getMonth() === 0);
    if (!inView(view)) setView(new Date(d.getFullYear(), d.getMonth(), 1));
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

  // Normalise the endpoints (previewEnd stands in for the end while hovering).
  const a = value.start;
  const b = previewEnd || value.end;
  const lo = a && b ? (a <= b ? a : b) : a;
  const hi = a && b ? (a <= b ? b : a) : null;

  const months = [
    new Date(view.getFullYear(), view.getMonth(), 1),
    new Date(view.getFullYear(), view.getMonth() + 1, 1)
  ];
  // One tabbable day across both grids: the start if shown, else the first of the view month.
  const tabbable = value.start ? iso(value.start) : iso(months[0]);
  const prevDisabled = months[0] <= minDate;
  const nextDisabled = new Date(view.getFullYear(), view.getMonth() + 2, 1) > maxDate;

  return (
    <div
      className="calendar calendar--range"
      ref={rootRef}
      onKeyDown={onKeyDown}
      onClick={(e) => {
        const btn = e.target.closest(".calendar__day");
        if (btn?.dataset.date) pick(parse(btn.dataset.date));
      }}
      onMouseOver={(e) => {
        if (!value.start || value.end) return;
        const btn = e.target.closest(".calendar__day");
        if (btn?.dataset.date) setPreviewEnd(parse(btn.dataset.date));
      }}
      onMouseLeave={() => setPreviewEnd(null)}
    >
      <div className="calendar__months">
        {months.map((month, mi) => (
          <div className="calendar__month" key={iso(month)}>
            <div className="calendar__caption">
              {mi === 0 ? (
                <button
                  className="calendar__nav"
                  type="button"
                  aria-label="Previous month"
                  disabled={prevDisabled}
                  onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
                >
                  <Chevron d="M15 6l-6 6l6 6" />
                </button>
              ) : (
                <span className="calendar__nav-spacer" aria-hidden="true" />
              )}
              <span className="calendar__caption-label">
                {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </span>
              {mi === 1 ? (
                <button
                  className="calendar__nav"
                  type="button"
                  aria-label="Next month"
                  disabled={nextDisabled}
                  onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
                >
                  <Chevron d="M9 6l6 6l-6 6" />
                </button>
              ) : (
                <span className="calendar__nav-spacer" aria-hidden="true" />
              )}
            </div>
            <MonthGrid
              month={month}
              minDate={minDate}
              maxDate={maxDate}
              lo={lo}
              hi={hi}
              tabbable={tabbable}
            />
          </div>
        ))}
      </div>
      <div className="calendar__footer" data-size="xs">
        <button
          className="button button--flat"
          type="button"
          data-color="neutral"
          disabled={!value.start}
          onClick={clearRange}
        >
          Clear
        </button>
        <div className="calendar__footer-actions">
          <button className="button button--secondary" type="button" onClick={cancel}>
            Cancel
          </button>
          <button
            className="button button--foreground"
            type="button"
            disabled={!(value.start && value.end)}
            onClick={apply}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function MonthGrid({ month, minDate, maxDate, lo, hi, tabbable }) {
  const m = month.getMonth();
  const startDow = mondayIndex(new Date(month.getFullYear(), m, 1));
  const gridStart = new Date(month.getFullYear(), m, 1 - startDow);
  const days = [];
  for (let i = 0; i < 42; i += 1)
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  // Drop a whole week with no in-month, in-range day (a trailing all-spillover row).
  const shownWeeks = weeks.filter((week) =>
    week.some((d) => d.getMonth() === m && d >= minDate && d <= maxDate)
  );

  return (
    <div
      className="calendar__days"
      role="grid"
      aria-label={month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
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
      {shownWeeks.map((week) => (
        <div key={iso(week[0])} className="calendar__week" role="row">
          {week.map((d) => {
            const top = hi || lo;
            // Out-of-range days hold their column but stay blank.
            if (d < minDate || d > maxDate)
              return <div key={iso(d)} className="calendar__day is-empty" aria-hidden="true" />;
            // Neighbouring-month days show their number but are inert (greyed). They
            // still carry the band when the range spans the month edge, but never
            // become an endpoint.
            if (d.getMonth() !== m) {
              const inRange = lo && d >= lo && d <= top;
              return (
                <div
                  key={iso(d)}
                  className={["calendar__cell", inRange && "is-range"].filter(Boolean).join(" ")}
                  aria-hidden="true"
                >
                  <div className="calendar__day is-outside">{d.getDate()}</div>
                </div>
              );
            }
            const isStart = lo && same(d, lo);
            const isEnd = top && same(d, top);
            const inRange = lo && d >= lo && d <= top;
            const cellCls = ["calendar__cell", inRange && "is-range"].filter(Boolean).join(" ");
            // No today marker in the range picker (matches the reference).
            const dayCls = ["calendar__day", isStart && "is-range-start", isEnd && "is-range-end"]
              .filter(Boolean)
              .join(" ");
            return (
              <div
                key={iso(d)}
                className={cellCls}
                role="gridcell"
                aria-selected={isStart || isEnd || undefined}
              >
                <button
                  type="button"
                  className={dayCls}
                  data-date={iso(d)}
                  aria-label={d.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                  tabIndex={iso(d) === tabbable ? 0 : -1}
                >
                  {d.getDate()}
                </button>
              </div>
            );
          })}
        </div>
      ))}
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
