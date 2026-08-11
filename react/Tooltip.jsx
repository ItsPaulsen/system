import { cloneElement, useEffect, useId, useRef, useState } from "react";

// Short label shown on hover or keyboard focus. Wrap the trigger; `label` is the bubble text
// and `side` the preferred placement, which flips if there's no room. Positioning mirrors the
// vanilla initTooltips (flip by space, clamp to viewport, arrow points at the trigger). Esc
// dismisses without moving the pointer or focus (WCAG 1.4.13).
const PAD = 8;
const GAP = 8;
const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

export default function Tooltip({ label, side = "top", children }) {
  const rootRef = useRef(null);
  const bubbleRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [placement, setPlacement] = useState(side);
  const id = useId();

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
    const onScroll = () => setVisible(false);
    const onKey = (e) => {
      if (e.key === "Escape") setVisible(false);
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
      data-tooltip-side={side}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {cloneElement(children, { "aria-describedby": id })}
      <span
        className={`tooltip__bubble${visible ? " is-visible" : ""}`}
        role="tooltip"
        id={id}
        ref={bubbleRef}
        data-placement={placement}
      >
        {label}
      </span>
    </span>
  );
}
