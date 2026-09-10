import { useEffect, useRef, useState } from "react";

// Two engines, one API, split on the same media query the stylesheet uses. On a
// pointer a ref holds `pos`, the track's translateX in [−maxScroll, 0], dragged with
// a rubber-band past the ends and settled to the nearest item. Under a finger the
// viewport is a native scroll container with snap points and the drag stays out of
// it, because a phone's own momentum beats any reimplementation of it. The set has
// ends either way. `items` are the slide nodes; `cols`/`gap` drive CSS custom props.
const TOUCH = "(hover: none) and (pointer: coarse)";
const RESIST = 0.3;
const EASE = "transform var(--carousel-slide)";
const COMMIT = 0.3; // of the viewport
const FLICK = 24; // px, under which a release is a press that wobbled
const THROW = 500; // ms, after which a release is a drag that stopped
const DRAG = 3; // px of travel before a press is a drag rather than a click

export default function Carousel({
  items,
  // Undefined by default: CSS can't override an inline style, and these are
  // meant to be set by class or breakpoint.
  cols,
  gap,
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

    const native = () => window.matchMedia(TOUCH).matches;
    // Hidden slides have no width and no offset, so counting them would let the
    // track travel to a slide that isn't there.
    const slots = () => Array.from(tr.children).filter((el) => !el.hidden);
    const maxScroll = () =>
      Math.max(0, (native() ? vp.scrollWidth : tr.scrollWidth) - vp.clientWidth);
    const scrollNow = () => (native() ? vp.scrollLeft : -pos.current);
    const points = () => {
      const list = slots();
      if (!list.length) return [0];
      const m = maxScroll();
      const base = list[0].offsetLeft;
      return list.map((it) => Math.min(it.offsetLeft - base, m));
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
    const currentIndex = () => nearestIndex(scrollNow());
    const render = (animate) => {
      if (native()) {
        // The track is laid out, not moved: leave it to the stylesheet.
        tr.style.removeProperty("transition");
        tr.style.removeProperty("transform");
        return;
      }
      tr.style.transition = animate ? EASE : "none";
      tr.style.transform = `translate3d(${pos.current}px, 0, 0)`;
    };
    const sync = () => {
      const scroll = scrollNow();
      const m = maxScroll();
      setAtStart(scroll <= 0.5);
      setAtEnd(scroll >= m - 0.5);
      setCurrent(nearestIndex(scroll) + 1);
    };
    const settle = (to, animate = true) => {
      const clamped = Math.max(0, Math.min(maxScroll(), to));
      if (native()) {
        vp.scrollTo({ left: clamped, behavior: animate ? "smooth" : "auto" });
        sync();
        return;
      }
      pos.current = -clamped;
      render(animate);
      sync();
    };
    const goTo = (i, animate = true) => {
      const pts = points();
      settle(pts[Math.max(0, Math.min(pts.length - 1, i))], animate);
    };
    api.current = { goTo, current: currentIndex };

    let down = false;
    let startX = 0;
    let startPos = 0;
    let startAt = 0;
    let startT = 0;
    let moved = false;
    let pointer = null;
    let swallow = false;
    const onDown = (e) => {
      if (e.button !== 0) return;
      // The platform is doing this itself under a finger, and one slide is nowhere
      // to go.
      if (native() || slots().length < 2) return;
      down = true;
      moved = false;
      swallow = false;
      startX = e.clientX;
      startPos = pos.current;
      startAt = currentIndex();
      startT = e.timeStamp;
      pointer = e.pointerId;
      vp.classList.add("is-dragging");
    };
    // The one thing cancelling the pointerdown default was for; cancelling that
    // also suppresses the mouse events a click is assembled from.
    const onDragStart = (e) => e.preventDefault();
    const onMove = (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > DRAG) {
        moved = true;
        // Only now: a captured pointer retargets the click to the element holding
        // it, so a press on a slide would never reach what it opens. A drag has
        // nothing to open.
        if (!vp.hasPointerCapture?.(pointer)) vp.setPointerCapture(pointer);
      }
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
      if (vp.hasPointerCapture?.(e.pointerId)) vp.releasePointerCapture(e.pointerId);
      vp.classList.remove("is-dragging");
      const s = slots();
      const stride = s.length > 1 ? s[1].offsetLeft - s[0].offsetLeft : vp.clientWidth;
      const dx = pos.current - startPos;
      const travel = Math.abs(dx);
      const spent = e.timeStamp - startT;
      // A drag past 30% of the window lands at any speed; a flick has to go far
      // enough to mean it and end soon enough to be a throw.
      const commit = travel > COMMIT * vp.clientWidth || (travel > FLICK && spent < THROW);
      const crossed = Math.round(-dx / stride);
      goTo(startAt + (crossed || (commit ? -Math.sign(dx) : 0)));
      // Spent by the next click. A listener removed a frame later is a race, and
      // losing it eats the next honest press.
      swallow = moved;
    };
    const onClick = (e) => {
      if (!swallow) return;
      swallow = false;
      e.preventDefault();
      e.stopPropagation();
    };
    // Scrolled by the finger rather than moved by us, coalesced to a frame.
    let syncFrame;
    const onScroll = () => {
      if (!native()) return;
      cancelAnimationFrame(syncFrame);
      syncFrame = requestAnimationFrame(sync);
    };
    const mq = window.matchMedia(TOUCH);
    // A rotation can change which engine this is.
    const onMode = () => {
      pos.current = 0;
      render(false);
      goTo(Math.max(0, Math.min(nearestIndex(scrollNow()), slots().length - 1)), false);
    };

    const onResize = () => goTo(currentIndex(), false);

    vp.addEventListener("pointerdown", onDown);
    vp.addEventListener("dragstart", onDragStart);
    vp.addEventListener("pointermove", onMove);
    vp.addEventListener("pointerup", onUp);
    vp.addEventListener("pointercancel", onUp);
    vp.addEventListener("lostpointercapture", onUp);
    vp.addEventListener("click", onClick, { capture: true });
    vp.addEventListener("scroll", onScroll, { passive: true });
    mq.addEventListener?.("change", onMode);
    window.addEventListener("resize", onResize);
    render(false);
    sync();
    return () => {
      vp.removeEventListener("pointerdown", onDown);
      vp.removeEventListener("dragstart", onDragStart);
      vp.removeEventListener("pointermove", onMove);
      vp.removeEventListener("pointerup", onUp);
      vp.removeEventListener("pointercancel", onUp);
      vp.removeEventListener("lostpointercapture", onUp);
      vp.removeEventListener("click", onClick, { capture: true });
      vp.removeEventListener("scroll", onScroll);
      mq.removeEventListener?.("change", onMode);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(syncFrame);
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
