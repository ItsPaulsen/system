import { cloneElement, useEffect, useId, useRef, useState } from "react";

// Short label shown on hover or keyboard focus. Wrap the trigger; `label` is the bubble text
// and `side` the preferred placement, which flips if there's no room. Positioning mirrors the
// vanilla initTooltips (flip by space, clamp to viewport, arrow points at the trigger). Esc
// dismisses without moving the pointer or focus, and the bubble stays up while the pointer is
// on it, so it can be read (WCAG 1.4.13).
const PAD = 8;
const GAP = 8;
const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

export default function Tooltip({ label, side = "top", children }) {
  const rootRef = useRef(null);
  const bubbleRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [placement, setPlacement] = useState(side);
  const id = useId();
  // WCAG 1.4.13 (hoverable): the bubble sits GAP off the trigger, so reaching it
  // crosses dead space. A grace delay keeps it up long enough to get there.
  const hideTimer = useRef(0);
  const show = () => {
    clearTimeout(hideTimer.current);
    setVisible(true);
  };
  const scheduleHide = () => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 120);
  };
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  useEffect(() => {
    if (!visible) return;
    const trigger = rootRef.current?.querySelector(":scope > :not(.tooltip__bubble)");
    const bubble = bubbleRef.current;
    if (trigger && bubble) {
      const t = trigger.getBoundingClientRect();
      const b = bubble.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let s = side;
      if (s === "top" && t.top - b.height - GAP < 0) s = "bottom";
      else if (s === "bottom" && t.bottom + b.height + GAP > vh) s = "top";
      else if (s === "left" && t.left - b.width - GAP < 0) s = "right";
      else if (s === "right" && t.right + b.width + GAP > vw) s = "left";
      setPlacement(s);

      let top;
      let left;
      let arrow;
      if (s === "top" || s === "bottom") {
        top = s === "top" ? t.top - b.height - GAP : t.bottom + GAP;
        const cx = t.left + t.width / 2;
        left = clamp(cx - b.width / 2, PAD, vw - b.width - PAD);
        arrow = clamp(cx - left, 10, b.width - 10);
      } else {
        left = s === "left" ? t.left - b.width - GAP : t.right + GAP;
        const cy = t.top + t.height / 2;
        top = clamp(cy - b.height / 2, PAD, vh - b.height - PAD);
        arrow = clamp(cy - top, 10, b.height - 10);
      }
      bubble.style.top = `${Math.round(top)}px`;
      bubble.style.left = `${Math.round(left)}px`;
      bubble.style.setProperty("--tt-arrow", `${Math.round(arrow)}px`);
    }

    // A fixed-position bubble drifts from the trigger on scroll, so just dismiss.
    const dismiss = () => {
      clearTimeout(hideTimer.current);
      setVisible(false);
    };
    const onScroll = () => dismiss();
    const onKey = (e) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [visible, side]);

  return (
    <span
      className="tooltip"
      ref={rootRef}
      onMouseEnter={show}
      onMouseLeave={scheduleHide}
      onFocus={show}
      // Ignore focus moving between the trigger's own descendants; only hide
      // when focus actually leaves.
      onBlur={(e) => {
        if (!e.relatedTarget || !rootRef.current?.contains(e.relatedTarget)) setVisible(false);
      }}
    >
      {cloneElement(children, { "aria-describedby": id })}
      <span
        className={["tooltip__bubble", visible && "is-visible"].filter(Boolean).join(" ")}
        role="tooltip"
        id={id}
        ref={bubbleRef}
        data-placement={placement}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
      >
        {label}
      </span>
    </span>
  );
}
