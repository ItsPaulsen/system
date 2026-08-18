import { useState } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

// The visible page list: 1, current ±1, total, with "ellipsis" markers across the gaps.
const windowed = (current, total) => {
  const out = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) out.push("ellipsis");
  for (let i = left; i <= right; i += 1) out.push(i);
  if (right < total - 1) out.push("ellipsis");
  if (total > 1) out.push(total);
  return out;
};

// Numbered page navigation. Uncontrolled via defaultPage; pass page + onPageChange to control it.
export default function Pagination({ total, page, defaultPage = 1, onPageChange }) {
  const [uncontrolled, setUncontrolled] = useState(defaultPage);
  const current = Math.min(total, Math.max(1, page ?? uncontrolled));

  const go = (p) => {
    const next = Math.min(total, Math.max(1, p));
    if (page === undefined) setUncontrolled(next);
    onPageChange?.(next);
  };

  return (
    <nav className="pagination" aria-label="Pagination">
      <ul className="pagination__list">
        <li>
          <button
            type="button"
            className="pagination__link"
            aria-label="Previous page"
            disabled={current === 1}
            onClick={() => go(current - 1)}
          >
            <IconChevronLeft aria-hidden="true" />
          </button>
        </li>
        {windowed(current, total).map((p, i) =>
          p === "ellipsis" ? (
            <li key={`ellipsis-${i}`}>
              <span className="pagination__ellipsis" aria-hidden="true">
                …
              </span>
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                className="pagination__link"
                aria-current={p === current ? "page" : undefined}
                onClick={() => go(p)}
              >
                {p}
              </button>
            </li>
          )
        )}
        <li>
          <button
            type="button"
            className="pagination__link"
            aria-label="Next page"
            disabled={current === total}
            onClick={() => go(current + 1)}
          >
            <IconChevronRight aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
