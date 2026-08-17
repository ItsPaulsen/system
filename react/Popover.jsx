import { createContext, useContext, useEffect, useId, useState } from "react";

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
  const cls = ["popover", panel && "popover--panel", center && "popover--center", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} id={id} popover="auto" {...rest}>
      {children}
    </div>
  );
}
