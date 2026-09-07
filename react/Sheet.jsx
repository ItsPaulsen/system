import { createContext, useContext, useEffect, useId, useRef, useState } from "react";

// Panel that slides in from a screen edge, built on native <dialog> via showModal(), so the
// focus trap, Esc-to-close, and inert background come for free. side="left" flips it to the
// opposite edge. Parts: Sheet / SheetTrigger / SheetContent / SheetHeader / SheetTitle /
// SheetClose / SheetBody. Styling is the vanilla .sheet classes.
const SheetContext = createContext(null);

export function Sheet({ children }) {
  const ref = useRef(null);
  const titleId = useId();
  // Wire aria-labelledby only when a title mounts, so it never dangles.
  const [hasTitle, setHasTitle] = useState(false);
  return (
    <SheetContext.Provider value={{ ref, titleId, hasTitle, setHasTitle }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetTrigger({ children, ...rest }) {
  const { ref } = useContext(SheetContext);
  return (
    <button type="button" onClick={() => ref.current?.showModal()} {...rest}>
      {children}
    </button>
  );
}

export function SheetClose({ children, ...rest }) {
  const { ref } = useContext(SheetContext);
  return (
    <button type="button" onClick={() => ref.current?.close()} {...rest}>
      {children}
    </button>
  );
}

export function SheetContent({ side, className, children, ...rest }) {
  const { ref, titleId, hasTitle } = useContext(SheetContext);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    const root = document.documentElement;
    // Reserve the scrollbar's width so the page doesn't shift as it locks.
    const lock = () => {
      root.style.setProperty("--scrollbar-comp", window.innerWidth - root.clientWidth + "px");
      root.classList.add("is-scroll-locked");
      dlg.querySelector(".sheet__inner")?.focus({ preventScroll: true });
    };
    const unlock = () => {
      // Overlays nest, so release the lock only when no other <dialog> is open.
      // Exclude self: on unmount this one can still be open.
      const others = [...document.querySelectorAll("dialog[open]")].some((d) => d !== dlg);
      if (others) return;
      root.classList.remove("is-scroll-locked");
      root.style.removeProperty("--scrollbar-comp");
    };
    // Backdrop click: the event target is the <dialog> itself; hit-test the box.
    const onClick = (e) => {
      if (e.target !== dlg) return;
      const r = dlg.getBoundingClientRect();
      const inside =
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) dlg.close();
    };
    const obs = new MutationObserver(() => (dlg.open ? lock() : unlock()));
    obs.observe(dlg, { attributes: true, attributeFilter: ["open"] });
    dlg.addEventListener("click", onClick);
    return () => {
      obs.disconnect();
      dlg.removeEventListener("click", onClick);
      unlock();
    };
  }, [ref]);

  const cls = ["sheet", side === "left" && "sheet--left", className].filter(Boolean).join(" ");
  return (
    <dialog ref={ref} className={cls} aria-labelledby={hasTitle ? titleId : undefined} {...rest}>
      <div className="sheet__inner" tabIndex={-1}>
        {children}
      </div>
    </dialog>
  );
}

export function SheetHeader({ children, ...rest }) {
  return (
    <header className="sheet__header" {...rest}>
      {children}
    </header>
  );
}

export function SheetTitle({ children, ...rest }) {
  const { titleId, setHasTitle } = useContext(SheetContext);
  // Tell SheetContent a title exists so it wires aria-labelledby.
  useEffect(() => {
    setHasTitle(true);
    return () => setHasTitle(false);
  }, [setHasTitle]);
  return (
    <h2 id={titleId} className="sheet__title" {...rest}>
      {children}
    </h2>
  );
}

export function SheetBody({ children, ...rest }) {
  return (
    <div className="sheet__body" {...rest}>
      {children}
    </div>
  );
}
