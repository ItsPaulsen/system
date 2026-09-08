// Product page: the colour swatches own the variant, so everything that differs
// between colourways (name, price, stock, store count, and every image in the
// gallery) is read off the checked radio rather than kept in a table here. The
// radios do the selection themselves; this only renders what follows from it.
(function () {
  const inputs = Array.from(document.querySelectorAll(".pdp-swatch__input"));
  if (!inputs.length) return;

  const out = {
    colour: document.querySelector("[data-pdp-colour]"),
    variant: document.querySelector("[data-pdp-variant]"),
    price: document.querySelector("[data-pdp-price]"),
    stores: document.querySelector("[data-pdp-stores]"),
    badge: document.querySelector("[data-pdp-stock-badge]"),
    stock: document.querySelector("[data-pdp-stock-label]"),
    lead: document.querySelector("[data-pdp-lead]")
  };
  const sources = Array.from(document.querySelectorAll("[data-pdp-source]"));
  const images = Array.from(document.querySelectorAll("[data-pdp-img]"));
  const thumbs = Array.from(document.querySelectorAll("[data-pdp-thumb]"));

  // Two stock states, each a badge skin plus the lead time it implies.
  const STOCK = {
    in: { skin: "badge--green", label: "In stock", lead: "Ships in 2-4 days" },
    order: { skin: "badge--amber", label: "Made to order", lead: "Ships in 6-8 weeks" }
  };

  const set = (el, text) => {
    if (el) el.textContent = text;
  };

  const render = (input) => {
    const d = input.dataset;
    set(out.colour, d.colour);
    set(out.variant, d.variant);
    set(out.price, d.price);
    set(out.stores, d.stores);

    const stock = STOCK[d.stock] || STOCK.in;
    set(out.stock, stock.label);
    set(out.lead, stock.lead);
    if (out.badge) {
      out.badge.classList.remove("badge--green", "badge--amber");
      out.badge.classList.add(stock.skin);
    }

    // One stem per colourway, the widths appended here: the same three files the
    // shop card serves, so a colour change costs no new download on a page the
    // listing was reached from. Only the first slide is described, the other two
    // are the same photograph (see the gallery comment in index.html).
    sources.forEach((el) => {
      el.srcset = `${d.img}-400.webp 400w, ${d.img}-640.webp 640w`;
    });
    images.forEach((el, n) => {
      el.src = `${d.img}-640.jpg`;
      el.alt = n === 0 ? d.alt : "";
    });
    thumbs.forEach((el) => {
      el.src = `${d.img}-400.webp`;
    });
  };

  inputs.forEach((input) =>
    input.addEventListener("change", () => {
      if (input.checked) render(input);
    })
  );

  // Deep link from a Shop card: ?colour=<slug> opens on that colourway.
  const asked = new URLSearchParams(location.search).get("colour");
  const wanted = asked && inputs.find((i) => i.value === asked);
  if (wanted && !wanted.checked) {
    wanted.checked = true;
    render(wanted);
  }
})();
