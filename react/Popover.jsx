import { createContext, useContext, useEffect, useId, useRef, useState } from "react";

// Floating surface on the native Popover API: top-layer, light-dismiss, Esc, and CSS anchor
// positioning, all driven by the trigger's popovertarget. --panel pads content, --center
// centers it on the trigger.
const PopoverContext = createContext(null);

export function Popover({ children }) {
  const id = useId();
  return <PopoverContext.Provider value={id}>{children}</PopoverContext.Provider>;
}

export function PopoverTrigger({ className = "button button--secondary", children, ...rest }) {
  const id = useContext(PopoverContext);
  // The native popover doesn't reflect open state to the trigger; sync
  // aria-expanded off its toggle event so screen readers hear open/closed.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const pop = document.getElementById(id);
    if (!pop) return;
    const onToggle = (e) => setOpen(e.newState === "open");
    pop.addEventListener("toggle", onToggle);
    return () => pop.removeEventListener("toggle", onToggle);
  }, [id]);
  return (
    <button
      type="button"
      className={className}
      popoverTarget={id}
      aria-haspopup="dialog"
      aria-expanded={open}
      {...rest}
    >
      {children}
    </button>
  );
}

export function PopoverContent({ panel = true, center, className, children, ...rest }) {
  const id = useContext(PopoverContext);
  const ref = useRef(null);
  const cls = ["popover", panel && "popover--panel", center && "popover--center", className]
    .filter(Boolean)
    .join(" ");
  // role="dialog" (the trigger promises aria-haspopup="dialog"), so move focus in
  // on open like shadcn; the native popover returns focus to the trigger on close.
  // Name it with aria-label / aria-labelledby via ...rest.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onToggle = (e) => {
      if (e.newState !== "open") return;
      const focusable = el.querySelector(
        'button:not([disabled]), select, [href], input, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable || el).focus();
    };
    el.addEventListener("toggle", onToggle);
    return () => el.removeEventListener("toggle", onToggle);
  }, []);
  return (
    <div ref={ref} className={cls} id={id} popover="auto" role="dialog" tabIndex={-1} {...rest}>
      {children}
    </div>
  );
}
