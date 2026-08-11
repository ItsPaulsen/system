import { createContext, useContext, useEffect, useRef } from "react";

// Panel that slides in from a screen edge, built on native <dialog> via showModal(), so the
// focus trap, Esc-to-close, and inert background come for free. side="left" flips it to the
// opposite edge. Parts: Sheet / SheetTrigger / SheetContent / SheetHeader / SheetTitle /
// SheetClose / SheetBody. Styling is the vanilla .sheet classes.
const SheetContext = createContext(null);

export function Sheet({ children }) {
  const ref = useRef(null);
  return <SheetContext.Provider value={ref}>{children}</SheetContext.Provider>;
}

export function SheetTrigger({ children, ...rest }) {
  const ref = useContext(SheetContext);
  return (
    <button type="button" onClick={() => ref.current?.showModal()} {...rest}>
      {children}
    </button>
  );
}

export function SheetClose({ children, ...rest }) {
  const ref = useContext(SheetContext);
  return (
    <button type="button" onClick={() => ref.current?.close()} {...rest}>
      {children}
    </button>
  );
}

export function SheetContent({ side, className, children, ...rest }) {
  const ref = useContext(SheetContext);

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
    <dialog ref={ref} className={cls} {...rest}>
      <div className="sheet__inner" tabIndex={-1}>
        {children}
      </div>
    </dialog>
  );
}

export function SheetHeader({ children }) {
  return <header className="sheet__header">{children}</header>;
}

export function SheetTitle({ children }) {
  return <h2 className="sheet__title">{children}</h2>;
}

export function SheetBody({ children }) {
  return <div className="sheet__body">{children}</div>;
}
