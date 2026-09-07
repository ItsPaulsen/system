import { createContext, useContext, useEffect, useId, useRef, useState } from "react";

// Floating surface on the native Popover API: top-layer, light-dismiss and Esc come from
// popovertarget; placement is scripted (CSS anchor positioning's flip/clamp fallbacks aren't
// reliable yet). --panel pads content, --center centers it on the trigger.
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

// Below the trigger by default, flipped up when cramped, clamped to the viewport.
function place(trigger, pop) {
  const GAP = 4;
  const PAD = 8;
  const t = trigger.getBoundingClientRect();
  const p = pop.getBoundingClientRect();
  let top = t.bottom + GAP;
  if (top + p.height + PAD > window.innerHeight && t.top - p.height - GAP > 0) {
    top = t.top - p.height - GAP;
  }
  const anchorLeft = pop.classList.contains("popover--center")
    ? t.left + t.width / 2 - p.width / 2
    : t.left;
  const left = Math.max(PAD, Math.min(anchorLeft, window.innerWidth - p.width - PAD));
  pop.style.left = `${Math.round(left)}px`;
  pop.style.top = `${Math.round(top)}px`;
}

export function PopoverContent({ panel = true, center, className, children, ...rest }) {
  const id = useContext(PopoverContext);
  const ref = useRef(null);
  const cls = ["popover", panel && "popover--panel", center && "popover--center", className]
    .filter(Boolean)
    .join(" ");
  // .popover is position:fixed with no inset, so an unplaced panel sits in the
  // viewport corner. Opening also moves focus in (the trigger promises
  // aria-haspopup="dialog"); closing returns it natively. Name it via ...rest.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const trigger = document.querySelector(`[popovertarget="${CSS.escape(id)}"]`);
    const reposition = () => trigger && place(trigger, el);
    const onToggle = (e) => {
      if (e.newState !== "open") {
        window.removeEventListener("scroll", reposition, true);
        window.removeEventListener("resize", reposition);
        return;
      }
      reposition();
      const focusable = el.querySelector(
        'button:not([disabled]), select, [href], input, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable || el).focus();
      window.addEventListener("scroll", reposition, true);
      window.addEventListener("resize", reposition);
    };
    el.addEventListener("toggle", onToggle);
    return () => {
      el.removeEventListener("toggle", onToggle);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [id]);
  return (
    <div ref={ref} className={cls} id={id} popover="auto" role="dialog" tabIndex={-1} {...rest}>
      {children}
    </div>
  );
}
