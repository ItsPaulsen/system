// Category filter and sort, plus the count that reports the result.
//
// Checking one or more Category boxes narrows the grid to posts whose tag
// matches; with none checked, everything shows. The Reading time band narrows on
// data-minutes alongside it, both having to pass. When nothing matches, the grid
// gives way to the empty state, whose "Clear all filters" button unchecks every
// box and restores the full grid. Pagination is a full-listing affordance, so it
// shows only when every post is visible and hides the moment a filter narrows
// the set (a partial demo set isn't paged).
//
// Categories are read from the visible tag text, so there's no second source of
// truth to keep in sync with the markup; the date is read off the <time datetime>
// the card already prints, so it has no second copy either. The one .blog-filter node
// is relocated between rail and sheet by chrome.js rather than recreated, so a
// change listener bound to it survives the move.
(function () {
  const filter = document.querySelector(".blog-filter");
  const grid = document.querySelector(".blog__grid");
  const empty = document.querySelector(".blog-empty");
  const pagination = document.querySelector(".blog__pagination");
  const sort = document.querySelector(".ex-sort");
  const countEl = document.querySelector("[data-blog-count]");
  const nouns = document.querySelectorAll("[data-blog-noun]");
  if (!filter || !grid || !empty) return;

  // The Reading time split: under 5 goes to "Under 5 min", 5 and up to
  // "Over 5 min", which is where an exactly-5-minute post lands.
  const SHORT = 5;

  const boxes = [...filter.querySelectorAll('input[type="checkbox"]')];
  const cards = [...grid.querySelectorAll(".blog-card")];

  const labelOf = (box) =>
    box.closest(".checkbox")?.querySelector(".checkbox__label")?.textContent.trim().toLowerCase();
  const categoryOf = (card) =>
    card.querySelector(".blog-card__tag")?.textContent.trim().toLowerCase();
  // ISO dates, so a string compare is a date compare.
  // The visible date is a <time datetime>, so it is already machine-readable;
  // no second copy on the card to keep in step with it.
  const dateOf = (card) => card.querySelector("time[datetime]")?.dateTime || "";
  const minutesOf = (card) => Number(card.dataset.minutes) || 0;
  const readBand = () => filter.querySelector('input[name="blog-read"]:checked')?.value || "any";

  const SORTS = {
    newest: (a, b) => dateOf(b).localeCompare(dateOf(a)),
    oldest: (a, b) => dateOf(a).localeCompare(dateOf(b))
  };
  let order = "newest";

  const apply = () => {
    const active = new Set(boxes.filter((b) => b.checked).map(labelOf));
    const band = readBand();
    let shown = 0;
    cards.forEach((card) => {
      const match =
        (active.size === 0 || active.has(categoryOf(card))) &&
        (band === "any" || (band === "short" ? minutesOf(card) < SHORT : minutesOf(card) >= SHORT));
      card.hidden = !match;
      if (match) shown += 1;
    });

    // Sort the full set, not just the matches, so the DOM order stays stable
    // while filters come and go.
    [...cards].sort(SORTS[order]).forEach((card) => grid.append(card));

    if (countEl) countEl.textContent = String(shown);
    nouns.forEach((n) => {
      n.textContent = shown === 1 ? "post" : "posts";
    });

    const isEmpty = shown === 0;
    empty.hidden = !isEmpty;
    grid.hidden = isEmpty;
    // Only page the complete listing; any active filter (shown < total) hides it.
    if (pagination) pagination.hidden = shown < cards.length;
  };

  filter.addEventListener("change", apply);

  sort?.addEventListener("select:change", (e) => {
    order = e.detail.option.dataset.sort || "newest";
    apply();
  });

  empty.querySelector("[data-blog-clear]")?.addEventListener("click", () => {
    boxes.forEach((b) => {
      b.checked = false;
    });
    const any = filter.querySelector('input[name="blog-read"][value="any"]');
    if (any) any.checked = true;
    apply();
  });

  apply();
})();
