// A shelf: one row of cards that scrolls sideways, dragged with a pointer and
// stepped with a pair of arrows on hover.
//
// A scroll container rather than a carousel, because the cards are the listing's
// own and a grid is what they are built for. Touch already scrolls it, so what is
// added here is the pointer drag and the arrows, so the row answers a mouse the
// way the product gallery does. Neither one snaps mid-move: a fixed-width shelf
// is pushed along, not stepped between slides, and both only tidy up at the end,
// landing on the nearest card boundary.
//
// Started life as the product page's "goes well with" row and was generalised
// when the shop landing wanted one per category. Every shelf on the page is wired
// the same way, so a page adds one by writing the markup:
//
//   <div class="ex-shelf">
//     <button class="carousel__control carousel__control--prev ex-shelf__control">
//     <div class="shop__grid ex-shelf__row"> … cards … </div>
//     <button class="carousel__control carousel__control--next ex-shelf__control">
//   </div>
document.querySelectorAll(".ex-shelf__row").forEach((row) => {
  const shelf = row.closest(".ex-shelf");
  const prev = shelf?.querySelector(".carousel__control--prev");
  const next = shelf?.querySelector(".carousel__control--next");

  const RESIST = 0.3; // the fraction of an overpull that shows, as in the carousel
  const DRAG = 5; // px of travel before a press counts as a drag rather than a click
  const COAST = 260; // ms of travel a release is worth, at the speed it was let go

  // A card's width is a sixth of the content cap, which doesn't divide evenly, so
  // a row of six that is meant to fit exactly can report a pixel or two of
  // overflow. That isn't somewhere to go, and treating it as somewhere to go put
  // a live Next arrow over the last product with nothing behind it to reach.
  const SLACK = 4;
  const scrollable = () => row.scrollWidth - row.clientWidth > SLACK;

  let down = false;
  let startX = 0;
  let startLeft = 0;
  let moved = false;
  let frame;
  let pull = 0;
  let pointer = null;
  let swallow = false; // the drag's own trailing click, still to be spent
  let vx = 0; // px/ms, smoothed over the move events
  let lastX = 0;
  let lastT = 0;

  // How far the cards sit past where the scroll can go. The scroller is clamped by
  // the browser, so this is drawn by shifting the children (see example.css).
  const setPull = (px) => {
    pull = px;
    row.style.setProperty("--ex-shelf-pull", `${px}px`);
  };

  // An arrow is only there while it has somewhere to go: hidden at the end it
  // points to, and both hidden when the window is wide enough to show every card
  // (the six-column case, where the row has nothing to scroll). Hiding rather
  // than disabling, because the row is hover chrome: a dimmed arrow over the
  // first product would be something to read and dismiss, and there is nothing
  // to explain.
  const sync = () => {
    if (!prev || !next) return;
    const max = row.scrollWidth - row.clientWidth;
    const at = row.scrollLeft;
    const stuck = !scrollable();
    prev.hidden = stuck || at <= SLACK;
    next.hidden = stuck || at >= max - SLACK;
  };

  // Where each card sits in the scroll, measured from the first one so the row's
  // own start padding (it bleeds to the window edge below md) counts as zero.
  const stops = () => {
    const base = row.firstElementChild?.offsetLeft || 0;
    return [...row.children].map((c) => c.offsetLeft - base);
  };

  // Ease out, and short: this is a correction of at most a card's width, not a
  // slide crossing the window, so it lands rather than travels. Any overpull
  // unwinds on the same curve, so the row arrives and straightens as one move.
  const glide = (to) => {
    const fromScroll = row.scrollLeft;
    const fromPull = pull;
    const dist = to - fromScroll;
    if (Math.abs(dist) < 1 && Math.abs(fromPull) < 1) return;
    const ms = Math.min(700, 160 + Math.max(Math.abs(dist), Math.abs(fromPull)) * 0.5);
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - (1 - p) ** 3;
      row.scrollLeft = fromScroll + dist * eased;
      setPull(fromPull * (1 - eased));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(step);
  };

  // Let go and the row carries on, then lands with a card flush to the start, so
  // what you see is whole cards and one peeking. The throw is the point: a shelf
  // that only ever corrected itself by half a card felt like it was resisting the
  // hand, however hard you pushed. Where it would have coasted to is speed times a
  // fixed time, and the nearest card to that is where it lands.
  //
  // At either end it stays where it is: the row is already against something, and
  // pulling it off that edge to align a card would undo the drag. It still glides,
  // to let any overpull go.
  const settle = () => {
    const max = row.scrollWidth - row.clientWidth;
    const at = row.scrollLeft;
    if (at <= 1 || at >= max - 1) {
      glide(at);
      return;
    }
    const thrown = at - vx * COAST;
    const near = stops().reduce(
      (best, o) => (Math.abs(o - thrown) < Math.abs(best - thrown) ? o : best),
      0
    );
    glide(Math.max(0, Math.min(max, near)));
  };

  row.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.pointerType !== "mouse") return;
    // A row that fits has nothing to drag, and arming the gesture anyway is what
    // made a press on a card get thrown away as though it had been one.
    if (!scrollable()) return;
    cancelAnimationFrame(frame); // taking hold of a row still settling
    down = true;
    moved = false;
    // A fresh press is never the tail of the last one, whatever became of that
    // gesture's click.
    swallow = false;
    startX = e.clientX;
    startLeft = row.scrollLeft;
    vx = 0;
    lastX = e.clientX;
    lastT = e.timeStamp;
    pointer = e.pointerId;
    row.classList.add("is-dragging");
  });

  // What the pointerdown used to prevent. Cancelling that default is the blunt
  // way to stop a card being dragged off as a link, and it also suppresses the
  // mouse events the click is built from, which browsers resolve differently:
  // that was a press going nowhere for no visible reason. This cancels the one
  // thing it was ever for, and the pressed row stops selecting text through the
  // .is-dragging class instead.
  row.addEventListener("dragstart", (e) => e.preventDefault());

  row.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    const max = row.scrollWidth - row.clientWidth;
    const want = startLeft - dx;
    const to = Math.max(0, Math.min(max, want));
    row.scrollLeft = to;
    // Whatever the scroll couldn't take is the overpull, resisted.
    setPull((to - want) * RESIST);
    // Smoothed, because a single frame's reading is noise: the last events before
    // a release are what the hand was doing, not the whole drag.
    const dt = e.timeStamp - lastT;
    if (dt > 0) {
      vx = vx * 0.7 + ((e.clientX - lastX) / dt) * 0.3;
      lastX = e.clientX;
      lastT = e.timeStamp;
    }
    // A drag is a gesture that took the shelf somewhere, not a pointer that
    // wandered. Hand-holding a mouse through a click moves it a few pixels, and
    // counting that as a drag is what made the cards need several tries: the row
    // hadn't gone anywhere, but the click was swallowed as if it had.
    if (!moved && Math.abs(dx) > DRAG && (row.scrollLeft !== startLeft || pull)) {
      moved = true;
      // Captured only now that it is a drag, never on the press itself. While the
      // row holds the pointer, the mouse events the click is built from are
      // retargeted to the row, so the click lands on the container and a card's
      // link is never followed: taking it up front made every card on a
      // scrollable row unopenable. A drag has no link to follow, so from here it
      // is free, and it keeps the gesture once the pointer leaves the row.
      row.setPointerCapture(pointer);
    }
  });

  const endDrag = (e) => {
    if (!down) return;
    down = false;
    if (row.hasPointerCapture?.(e.pointerId)) row.releasePointerCapture(e.pointerId);
    row.classList.remove("is-dragging");
    if (!moved) {
      if (pull) glide(row.scrollLeft);
      return;
    }
    settle();
    // Let go over a card and the click would follow its link, so the drag's own
    // trailing click is spent here. A flag rather than a listener that takes
    // itself off a frame later: whether that frame beat the click was a race, and
    // losing it left a live swallow to eat the next honest press.
    swallow = true;
  };

  // Exactly one click, and only the one the drag itself produced. The cards are
  // anchors, but a page could bind a listener to them too, so the event is
  // stopped as well as defaulted (same as the carousel's own guard).
  row.addEventListener(
    "click",
    (e) => {
      if (!swallow) return;
      swallow = false;
      e.preventDefault();
      e.stopPropagation();
    },
    { capture: true }
  );

  row.addEventListener("pointerup", endDrag);
  row.addEventListener("pointercancel", endDrag);
  row.addEventListener("lostpointercapture", endDrag);

  // A press moves the row by what's on screen, then lands on a card boundary the
  // way a release does, so the arrows and the drag leave the shelf in the same
  // kind of position. The last step is short by whatever the row has left, which
  // is the end clamp doing its job rather than a case to special-case.
  const page = (dir) => {
    cancelAnimationFrame(frame);
    const max = row.scrollWidth - row.clientWidth;
    const want = row.scrollLeft + dir * row.clientWidth;
    const near = stops().reduce(
      (best, o) => (Math.abs(o - want) < Math.abs(best - want) ? o : best),
      0
    );
    glide(Math.max(0, Math.min(max, near)));
  };

  prev?.addEventListener("click", () => page(-1));
  next?.addEventListener("click", () => page(1));

  // Every move the row makes -- a drag, a glide, a trackpad, a tab into a card
  // off screen -- lands as a scroll event, including the ones set from here, so
  // this one listener is the whole story. Resize, because how much there is to
  // scroll changes with the window.
  row.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  sync();
});
