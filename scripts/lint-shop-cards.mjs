// The product cards are written once, on the category listings, and copied onto
// the pages that show a few of them: the shop landing's shelves and the product
// page's own row. Copies drift. The store availability on these cards disagreed
// with the product page's for weeks before anyone read both in one sitting, and
// nothing would have said so.
//
// So this reads the copies back against the page they came from and fails if any
// of them has fallen behind. What is compared is what a reader sees and what the
// filters run on: the brand, the name, the price and its terms, the availability,
// the badge, and the shot. Not the parts a copy is meant to differ in, the
// `sizes` attribute and the data attributes a shelf has no filter for.
import { readFileSync } from "node:fs";

const SOURCE = "demo/example/shop/chairs/index.html";
const COPIES = ["demo/example/shop/index.html", "demo/example/shop/product/index.html"];

const text = (html) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const cards = (html) =>
  html
    .split(/<a\s*\n?\s*class="shop-card"/)
    .slice(1)
    .map((card) => {
      const body = card.slice(0, card.indexOf("</a>"));
      const pick = (re) => (body.match(re) || [null, ""])[1];
      return {
        href: pick(/href="([^"]*)"/),
        brand: text(pick(/class="shop-card__brand">([\s\S]*?)<\/span\s*>/) || ""),
        name: text(pick(/class="shop-card__variant"[^>]*>([\s\S]*?)<\/span\s*>/) || ""),
        price: text(pick(/class="shop-card__price">([\s\S]*?)<\/span\s*>/) || ""),
        terms: text(
          pick(/class="shop-card__terms">([\s\S]*?)<\/span\s*>\s*<span class="shop-card__avail"/) ||
            ""
        ),
        avail: text(pick(/class="shop-card__avail">([\s\S]*?)<\/span>\s*<\/span>/) || ""),
        badge: text(pick(/class="badge shop-card__badge[^"]*">([\s\S]*?)<\/span\s*>/) || ""),
        // The stem, not the whole srcset: a copy serves the same photograph at a
        // width of its own choosing.
        shot: (pick(/src="([^"]*products\/[^"]*)"/) || "").replace(/-\d+\.(jpg|webp)$/, "")
      };
    });

const source = cards(readFileSync(SOURCE, "utf8"));
const FIELDS = ["brand", "name", "price", "terms", "avail", "badge", "shot"];

let failed = false;
let checked = 0;

for (const file of COPIES) {
  for (const copy of cards(readFileSync(file, "utf8"))) {
    const from = source.find((c) => c.name === copy.name && c.brand === copy.brand);
    if (!from) {
      console.error(`${file}: "${copy.brand} ${copy.name}" is on no listing.`);
      console.error(`    Every card here is a copy of one in ${SOURCE}.`);
      failed = true;
      continue;
    }
    checked += 1;
    for (const field of FIELDS) {
      if (from[field] === copy[field]) continue;
      console.error(`${file}: "${copy.name}" has drifted from ${SOURCE}.`);
      console.error(`    ${field}: "${copy[field]}"`);
      console.error(`    ${" ".repeat(field.length)}  ${SOURCE} says "${from[field]}"`);
      failed = true;
    }
  }
}

// The card's availability marks are the product page's two glyphs, carried into
// shop.css as mask URLs because a card draws thirty of them and an <svg> apiece
// is thirty copies of the same path. That makes them a copy like any other, and
// this reads them back the same way: change the tick on the product page and the
// listings keep drawing the old one, silently, on the one screen a reader
// compares them from.
const MARKS = "demo/example/shop/shop.css";
const marks = readFileSync(MARKS, "utf8");
const page = readFileSync("demo/example/shop/product/index.html", "utf8");

for (const [icon, name] of [
  ["check", "--shop-mark-yes"],
  ["cross", "--shop-mark-no"]
]) {
  const path = (page.match(new RegExp(`data-icon="${icon}"[\\s\\S]*?<path\\s+d="([^"]+)"`)) ||
    [])[1];
  if (!path) {
    console.error(`demo/example/shop/product/index.html: no ${icon} icon to compare against.`);
    failed = true;
    continue;
  }
  const value = (marks.match(new RegExp(`${name}: url\\("([^"]+)"\\)`)) || [])[1];
  if (value && value.includes(encodeURIComponent(path))) continue;
  console.error(`${MARKS}: ${name} has drifted from the product page's ${icon}.`);
  console.error("    Rebuild it from that page's path rather than editing the URL.");
  failed = true;
}

if (failed) process.exit(1);
console.log(`${checked} copied cards match ${SOURCE}, and both marks match its glyphs`);
