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
      // error/warning are interruptive; loading stays until the promise settles.
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
    <div
      className={["toast", visible && "is-visible"].filter(Boolean).join(" ")}
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
      data-type={type}
    >
      <span className="toast__icon">
        {type === "loading" ? <span className="toast__spinner" /> : Icon ? <Icon /> : null}
      </span>
      <span className="toast__text">{current?.message}</span>
    </div>
  );
}
