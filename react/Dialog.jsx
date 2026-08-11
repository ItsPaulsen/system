import { createContext, useContext, useEffect, useId, useRef } from "react";

// Compound dialog backed by showModal(), so focus trap, Esc, and inert backdrop come free.
const DialogContext = createContext(null);

export function Dialog({ children }) {
  const ref = useRef(null);
  const titleId = useId();
  return <DialogContext.Provider value={{ ref, titleId }}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({ children, ...rest }) {
  const { ref } = useContext(DialogContext);
  return (
    <button type="button" onClick={() => ref.current?.showModal()} {...rest}>
      {children}
    </button>
  );
}

export function DialogClose({ children, ...rest }) {
  const { ref } = useContext(DialogContext);
  return (
    <button type="button" onClick={() => ref.current?.close()} {...rest}>
      {children}
    </button>
  );
}

export function DialogContent({ children, ...rest }) {
  const { ref, titleId } = useContext(DialogContext);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    const root = document.documentElement;
    // Reserve the scrollbar's width so the page doesn't shift as it locks.
    const lock = () => {
      root.style.setProperty("--scrollbar-comp", window.innerWidth - root.clientWidth + "px");
      root.classList.add("is-scroll-locked");
      dlg.querySelector(".dialog__inner")?.focus({ preventScroll: true });
    };
    const unlock = () => {
      root.classList.remove("is-scroll-locked");
      root.style.removeProperty("--scrollbar-comp");
    };
    // Backdrop click: the event target is the <dialog> itself; hit-test the box
    // so a click on its own padding doesn't count.
    const onClick = (e) => {
      if (e.target !== dlg) return;
      const r = dlg.getBoundingClientRect();
      const inside =
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) dlg.close();
    };
    // showModal()/close() toggle the `open` attribute; watch it to lock/unlock.
    const obs = new MutationObserver(() => (dlg.open ? lock() : unlock()));
    obs.observe(dlg, { attributes: true, attributeFilter: ["open"] });
    dlg.addEventListener("click", onClick);
    return () => {
      obs.disconnect();
      dlg.removeEventListener("click", onClick);
      unlock();
    };
  }, [ref]);

  return (
    <dialog ref={ref} className="dialog" aria-labelledby={titleId} {...rest}>
      <div className="dialog__inner" tabIndex={-1}>
        {children}
      </div>
    </dialog>
  );
}

export function DialogTitle({ children, className, ...rest }) {
  const { titleId } = useContext(DialogContext);
  return (
    <h2 id={titleId} className={["dialog__title", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </h2>
  );
}

export function DialogDescription({ children, className, ...rest }) {
  return (
    <p className={["dialog__text", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </p>
  );
}

export function DialogActions({ children, className, ...rest }) {
  return (
    <div className={["dialog__actions", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
}
