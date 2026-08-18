import { IconUser } from "@tabler/icons-react";

// Image with a fallback: pass `src` for a photo, or `fallback` (initials or a glyph)
// when there's no image. `size` is "sm" | "lg"; `status` adds a presence dot.
export function Avatar({ src, alt = "", fallback, size, status, className, ...rest }) {
  const cls = ["avatar", size && `avatar--${size}`, className].filter(Boolean).join(" ");
  return (
    <span className={cls} {...rest}>
      {src ? (
        <img className="avatar__img" src={src} alt={alt} />
      ) : (
        <span className="avatar__fallback">{fallback ?? <IconUser />}</span>
      )}
      {status && (
        <span className="avatar__status">
          <span className="sr-only">Online</span>
        </span>
      )}
    </span>
  );
}

// Overlapping stack for a set of people; cap it with a count avatar.
export function AvatarGroup({ children, ...rest }) {
  return (
    <span className="avatar-group" {...rest}>
      {children}
    </span>
  );
}
