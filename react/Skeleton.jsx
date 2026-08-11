// Placeholder that holds content's shape while it loads. variant: default block, "circle"
// (avatar), or "text" (a line). Set width/height via style to match the real content so the
// layout doesn't shift on swap. Mark the loading region (not each shape) with role="status".
export default function Skeleton({ variant, className, ...rest }) {
  const cls = ["skeleton", variant && `skeleton--${variant}`, className].filter(Boolean).join(" ");
  return <div className={cls} {...rest} />;
}
