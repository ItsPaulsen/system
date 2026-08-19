import { useEffect, useRef, useState } from "react";
import {
  IconInfoCircle,
  IconCircleCheck,
  IconAlertTriangle,
  IconAlertCircle
} from "@tabler/icons-react";

// Toast notifications. Mount <Toaster /> once near the root, then call toast(message) from
// anywhere. Typed helpers (toast.success/info/warning/error) add a matching icon; toast.promise
// shows a loading toast that resolves to success or error. One reused pill, like the vanilla.
const ICON = {
  info: IconInfoCircle,
  success: IconCircleCheck,
  warning: IconAlertTriangle,
  error: IconAlertCircle
};

// Tiny bridge so the imperative toast() can reach the mounted <Toaster />.
let emit;

export function toast(message, opts = {}) {
  emit?.(message, opts);
}
toast.success = (m) => toast(m, { type: "success" });
toast.info = (m) => toast(m, { type: "info" });
toast.warning = (m) => toast(m, { type: "warning" });
toast.error = (m) => toast(m, { type: "error" });
toast.promise = (p, msgs = {}) => {
  toast(msgs.loading || "Loading…", { type: "loading", duration: Infinity });
  Promise.resolve(p).then(
    () => toast(msgs.success || "Done", { type: "success" }),
    () => toast(msgs.error || "Something went wrong", { type: "error" })
  );
  return p;
};

export function Toaster() {
  const [current, setCurrent] = useState(null);
  const [visible, setVisible] = useState(false);
  const timer = useRef(0);

  useEffect(() => {
    emit = (message, opts) => {
      setCurrent({ message, type: opts.type || "default" });
      setVisible(true);
      clearTimeout(timer.current);
      // Infinity duration = a loading toast; it stays until the promise settles.
      if (opts.duration !== Infinity) {
        timer.current = setTimeout(() => setVisible(false), opts.duration || 4000);
      }
    };
    return () => {
      clearTimeout(timer.current);
      emit = undefined;
    };
  }, []);

  const type = current?.type || "default";
  const assertive = type === "error" || type === "warning";
  const Icon = ICON[type];

  return (
    <>
      {/* Two persistent live regions, created before any message and never
          role-swapped (swapping role/aria-live on one node is unreliable). The
          message flows through the matching one; the visible pill is aria-hidden. */}
      <div className="sr-only" role="status" aria-live="polite">
        {current && !assertive ? current.message : ""}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive">
        {current && assertive ? current.message : ""}
      </div>
      <div
        className={["toast", visible && "is-visible"].filter(Boolean).join(" ")}
        data-type={type}
        aria-hidden="true"
      >
        <span className="toast__icon">
          {type === "loading" ? (
            <svg className="toast__spinner" viewBox="0 0 50 50" aria-hidden="true">
              <circle
                className="toast__spinner-track"
                cx="25"
                cy="25"
                r="20"
                fill="none"
                strokeWidth="5"
              />
              <circle
                className="toast__spinner-arc"
                cx="25"
                cy="25"
                r="20"
                fill="none"
                strokeWidth="5"
              />
            </svg>
          ) : Icon ? (
            <Icon />
          ) : null}
        </span>
        <span className="toast__text">{current?.message}</span>
      </div>
    </>
  );
}
