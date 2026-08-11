import { createContext, useContext, useId } from "react";

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
  return (
    <button type="button" className={className} popoverTarget={id} aria-haspopup="dialog" {...rest}>
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
