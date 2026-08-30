import { useEffect, useRef, useState } from "react";

// Transform-driven carousel (like Embla, no native scroll underneath so the two
// coordinate systems can't fight). A ref holds `pos`, the track's translateX in
// [−maxScroll, 0]. The pointer drags it (mouse and touch) with a rubber-band past the
// ends; release settles to the nearest item. Buttons/keys step one item. `items` are
// the slide nodes; `cols`/`gap` drive CSS custom props.
const RESIST = 0.3;
const EASE = "transform 350ms var(--motion-ease-out)";

export default function Carousel({
  items,
  cols = 1,
  gap = "1rem",
  className,
  "aria-label": ariaLabel
}) {
  const viewport = useRef(null);
  const track = useRef(null);
  const pos = useRef(0);
  const api = useRef({ goTo: () => {}, current: () => 0 });
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [current, setCurrent] = useState(1);
  const cls = ["carousel", className].filter(Boolean).join(" ");

  useEffect(() => {
    const vp = viewport.current;
    const tr = track.current;
    if (!vp || !tr) return;

    const maxScroll = () => Math.max(0, tr.scrollWidth - vp.clientWidth);
    const points = () => {
      const m = maxScroll();
      const base = tr.children[0].offsetLeft;
      return Array.from(tr.children).map((it) => Math.min(it.offsetLeft - base, m));
    };
    const nearestIndex = (scroll) => {
      let bi = 0;
      let bd = Infinity;
      points().forEach((p, i) => {
        if (Math.abs(p - scroll) < bd) {
          bd = Math.abs(p - scroll);
          bi = i;
        }
      });
      return bi;
    };
    const render = (animate) => {
      tr.style.transition = animate ? EASE : "none";
      tr.style.transform = `translate3d(${pos.current}px, 0, 0)`;
    };
    const sync = () => {
      const scroll = -pos.current;
      const m = maxScroll();
      setAtStart(scroll <= 0.5);
      setAtEnd(scroll >= m - 0.5);
      setCurrent(nearestIndex(scroll) + 1);
    };
    const settle = (scroll) => {
      pos.current = -Math.max(0, Math.min(maxScroll(), scroll));
      render(true);
      sync();
    };
    const goTo = (i) => {
      const pts = points();
      settle(pts[Math.max(0, Math.min(pts.length - 1, i))]);
    };
    const current = () => nearestIndex(-pos.current);
    api.current = { goTo, current };

    let down = false;
    let startX = 0;
    let startPos = 0;
    let moved = false;
    const onDown = (e) => {
      if (e.button !== 0) return;
      if (e.pointerType === "mouse") e.preventDefault();
      down = true;
      moved = false;
      startX = e.clientX;
      startPos = pos.current;
      vp.setPointerCapture(e.pointerId);
      vp.classList.add("is-dragging");
    };
    const onMove = (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      const min = -maxScroll();
      let p = startPos + dx;
      if (p > 0) p *= RESIST;
      else if (p < min) p = min + (p - min) * RESIST;
      pos.current = p;
      render(false);
    };
    const onUp = (e) => {
      if (!down) return;
      down = false;
      vp.releasePointerCapture?.(e.pointerId);
      vp.classList.remove("is-dragging");
      goTo(nearestIndex(Math.max(0, Math.min(maxScroll(), -pos.current))));
      if (moved) {
        const swallow = (c) => c.preventDefault();
        vp.addEventListener("click", swallow, { capture: true });
        requestAnimationFrame(() => vp.removeEventListener("click", swallow, { capture: true }));
      }
    };
    const onResize = () => goTo(current());

    vp.addEventListener("pointerdown", onDown);
    vp.addEventListener("pointermove", onMove);
    vp.addEventListener("pointerup", onUp);
    vp.addEventListener("pointercancel", onUp);
    vp.addEventListener("lostpointercapture", onUp);
    window.addEventListener("resize", onResize);
    render(false);
    sync();
    return () => {
      vp.removeEventListener("pointerdown", onDown);
      vp.removeEventListener("pointermove", onMove);
      vp.removeEventListener("pointerup", onUp);
      vp.removeEventListener("pointercancel", onUp);
      vp.removeEventListener("lostpointercapture", onUp);
      window.removeEventListener("resize", onResize);
    };
  }, [items.length]);

  const step = (dir) => api.current.goTo(api.current.current() + dir);

  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    }
  };

  return (
    <div
      className={cls}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      style={{ "--carousel-cols": cols, "--carousel-gap": gap }}
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        className="carousel__control carousel__control--prev"
        aria-label="Previous slide"
        disabled={atStart}
        onClick={() => step(-1)}
      >
        <ChevronLeft />
      </button>
      <div className="carousel__viewport" ref={viewport}>
        <ul className="carousel__track" ref={track}>
          {items.map((item, i) => (
            <li key={i} className="carousel__item" role="group" aria-roledescription="slide">
              {item}
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        className="carousel__control carousel__control--next"
        aria-label="Next slide"
        disabled={atEnd}
        onClick={() => step(1)}
      >
        <ChevronRight />
      </button>
      <span className="sr-only" aria-live="polite" data-carousel-status>
        Slide {current} of {items.length}
      </span>
    </div>
  );
}

const ChevronLeft = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M15 6l-6 6l6 6" />
  </svg>
);

const ChevronRight = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 6l6 6l-6 6" />
  </svg>
);
