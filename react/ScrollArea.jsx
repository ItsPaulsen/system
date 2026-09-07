import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// A scroll container whose scrollbar is a real element instead of the platform's,
// so it can be styled and revealed like the rest of the system's affordances. The
// viewport does the actual scrolling; this only sizes and places the thumb, and
// lets you drag it. Give the viewport a height via viewportClassName or style.
export default function ScrollArea({ children, className, viewportClassName, ...rest }) {
  const MIN_THUMB = 24; // keep it grabbable on very long content
  const viewport = useRef(null);
  const bar = useRef(null);
  const [thumb, setThumb] = useState(null); // null = content fits, no bar
  const [scrolling, setScrolling] = useState(false);
  const [dragging, setDragging] = useState(false);
  const hideTimer = useRef();

  const measure = useCallback(() => {
    const el = viewport.current;
    const track = bar.current?.clientHeight ?? 0;
    if (!el || !track) return;
    const overflow = el.scrollHeight - el.clientHeight;
    // A pixel of slack: sub-pixel layout can leave scrollHeight a hair over
    // clientHeight on content that visually fits, which would flash the bar.
    if (overflow <= 1) return setThumb(null);
    const height = Math.max(MIN_THUMB, (el.clientHeight / el.scrollHeight) * track);
    setThumb({ height, top: (el.scrollTop / overflow) * (track - height) });
  }, []);

  useLayoutEffect(measure, [measure, children]);

  // Content height changes on its own (disclosures open, rows filter out), so
  // watch the viewport and its children rather than recomputing on a timer.
  useEffect(() => {
    const el = viewport.current;
    if (!el || typeof ResizeObserver !== "function") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    [...el.children].forEach((child) => ro.observe(child));
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // Shown while scrolling as well as on hover, so a wheel or keyboard scroll
  // still reports position when the pointer is elsewhere.
  const onScroll = () => {
    measure();
    setScrolling(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setScrolling(false), 700);
  };

  // Drag maps pointer movement to scrollTop by the track-to-content ratio, so the
  // thumb tracks the cursor exactly rather than drifting.
  const onThumbDown = (e) => {
    e.preventDefault(); // don't start a text selection in the content
    const el = viewport.current;
    const range = (bar.current?.clientHeight ?? 0) - (thumb?.height ?? 0);
    if (!el || range <= 0) return;
    const startY = e.clientY;
    const startScroll = el.scrollTop;
    const overflow = el.scrollHeight - el.clientHeight;
    const target = e.currentTarget;

    setDragging(true);
    target.setPointerCapture(e.pointerId);
    const move = (ev) => {
      el.scrollTop = startScroll + ((ev.clientY - startY) / range) * overflow;
    };
    const up = () => {
      setDragging(false);
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };

  // Track click pages toward the click, the way a native bar does.
  const onBarDown = (e) => {
    const el = viewport.current;
    if (!el || !thumb || e.target !== e.currentTarget) return;
    const rect = bar.current.getBoundingClientRect();
    const dir = e.clientY - rect.top < thumb.top ? -1 : 1;
    el.scrollBy({ top: dir * el.clientHeight * 0.9, behavior: "smooth" });
  };

  const cls = ["scroll-area", scrolling && "is-scrolling", dragging && "is-dragging", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} data-scrollable={thumb ? "true" : "false"} {...rest}>
      <div
        ref={viewport}
        className={["scroll-area__viewport", viewportClassName].filter(Boolean).join(" ")}
        onScroll={onScroll}
      >
        {children}
      </div>
      <div ref={bar} className="scroll-area__bar" aria-hidden="true" onPointerDown={onBarDown}>
        <div
          className="scroll-area__thumb"
          style={thumb ? { height: `${thumb.height}px`, top: `${thumb.top}px` } : undefined}
          onPointerDown={onThumbDown}
        />
      </div>
    </div>
  );
}
