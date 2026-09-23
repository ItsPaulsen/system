// The catalogue, and the one rule for matching words against it.
//
// The products are written on the category listings and nowhere else. Anything
// that has to search them (the field's suggestion panel, the results page) reads
// them from here, so there is one fetch per visit however many of them ask, and
// one answer to what a word finds. The two used to carry a copy each, which is
// how the panel came to offer less than the page it led to.
//
// A new category joins by being added to SOURCES.
window.exampleCatalogue = (function () {
  const SOURCES = ["/demo/example/shop/chairs/"];

  const tokens = (value) => (value || "").split(/\s+/).filter(Boolean);

  // Where in a word a run may land depends on how much of it there is. At the
  // start of a word it always counts: that is someone part way through typing it.
  // Buried inside one it counts from four, because three still catches real words
  // inside longer ones and "red" finding a black chair through "lacquered" is the
  // kind of answer that makes a reader stop trusting the field.
  const MID = 4;
  const escape = (word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const at = (text, word) => {
    const start = text.search(new RegExp(`\\b${escape(word)}`, "i"));
    if (start >= 0) return start;
    return word.length >= MID ? text.toLowerCase().indexOf(word) : -1;
  };

  // Every word has to land somewhere, in any order, so "chair muuto" finds what
  // "muuto chair" does.
  const words = (q) => q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const match = (text, q) => words(q).every((word) => at(text, word) >= 0);

  // What a card is searchable by: the words on it, the colours it is tagged with,
  // the families those colours belong to, its category and its kind. The families
  // are why "red" finds a chair tagged falu, and reading them off the Colour
  // facet's own markup is why typing red finds what ticking Red finds. The kind is
  // why "lounge" finds a Mama Bear, whose name never says so.
  const textOf = (card, families) =>
    [
      card.querySelector(".shop-card__brand")?.textContent || "",
      card.querySelector(".shop-card__variant")?.textContent || "",
      card.dataset.color || "",
      tokens(card.dataset.color)
        .flatMap((colour) => families.get(colour) || [])
        .join(" "),
      card.dataset.category || "",
      card.dataset.type || ""
    ]
      .join(" ")
      .toLowerCase()
      .replace(/\s+/g, " ");

  // One fetch per visit, whoever asks first. The listing is usually the page the
  // reader has just come from, so it is usually already in the browser's cache.
  let loading = null;

  const load = () => {
    loading =
      loading ||
      Promise.all(
        SOURCES.map((href) =>
          fetch(href)
            .then((r) => (r.ok ? r.text() : ""))
            .catch(() => "")
        )
      ).then((pages) => {
        const families = new Map();
        const cards = [];
        let doc = null;
        pages.forEach((html) => {
          if (!html) return;
          const page = new DOMParser().parseFromString(html, "text/html");
          doc = doc || page;
          page.querySelectorAll('[data-filter="color"] .checkbox').forEach((row) => {
            const label = row.querySelector(".checkbox__label")?.textContent.trim() || "";
            tokens(row.querySelector("input")?.dataset.colors).forEach((colour) => {
              families.set(colour, [...(families.get(colour) || []), label]);
            });
          });
          page.querySelectorAll(".shop-card").forEach((card) => cards.push(card));
        });
        return { doc, cards, families };
      });
    return loading;
  };

  return { load, match, textOf, tokens };
})();
