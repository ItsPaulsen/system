import { useEffect, useRef } from "react";

// Rows and columns of data. Wraps the native table in .table-wrap so wide tables scroll.
// Children are the usual thead/tbody markup; props pass through to the table.
// When the wrap actually overflows it becomes a focusable region so keyboard users can
// pan it; a table that fits gets no tab stop. Pass ariaLabel to name the scroll region.
export default function Table({ children, className, ariaLabel, ...rest }) {
  const wrapRef = useRef(null);
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const sync = () => {
      if (wrap.scrollWidth > wrap.clientWidth + 1) {
        wrap.setAttribute("role", "region");
        wrap.setAttribute("tabindex", "0");
        wrap.setAttribute("aria-label", ariaLabel || "Scrollable table");
      } else {
        wrap.removeAttribute("role");
        wrap.removeAttribute("tabindex");
        wrap.removeAttribute("aria-label");
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [ariaLabel]);
  return (
    <div className="table-wrap" ref={wrapRef}>
      <table className={["table", className].filter(Boolean).join(" ")} {...rest}>
        {children}
      </table>
    </div>
  );
}
