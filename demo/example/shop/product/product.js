// Product page: the colour swatches own the variant, so everything that differs
// between colourways (name, price, stock, store count, and every image in the
// gallery) is read off the checked radio rather than kept in a table here. The
// radios do the selection themselves; this only renders what follows from it.
(function () {
  const inputs = Array.from(document.querySelectorAll(".pdp-swatch__input"));
  if (!inputs.length) return;

  const out = {
    color: document.querySelector("[data-pdp-color]"),
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
    set(out.color, d.color);
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

    // One stem per colourway, the widths appended here: the same files the shop
    // card serves, so a colour change costs no new download on a page the listing
    // was reached from. Only the pack shot carries these hooks; the back view and
    // the detail shot belong to the model, not the colour.
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

  // Add to cart swaps the button for the quantity field in the same slot: the two
  // are the same pill, so what changes is the control's contents. Stepping the
  // quantity back to 0 is what removes it again, and focus returns to the button
  // then, since the control the user just pressed has left the page.
  const add = document.querySelector("[data-pdp-add]");
  const qty = document.querySelector("[data-pdp-qty]");
  const qtyInput = qty && qty.querySelector(".number-field__input");

  if (add && qty && qtyInput) {
    const show = (inCart) => {
      add.hidden = inCart;
      qty.hidden = !inCart;
    };

    add.addEventListener("click", () => {
      qtyInput.value = "1";
      // The steppers were disabled against a value of 0, so let the component
      // re-read the new one.
      qtyInput.dispatchEvent(new Event("input", { bubbles: true }));
      show(true);
      // No focus move: adding to the cart finished the action. Stepping the
      // quantity is the user's call, not a prompt.
    });

    // initNumberFields fires `change` on every step; blur covers a typed 0.
    const check = () => {
      if (Number(qtyInput.value) > 0) return;
      show(false);
      add.focus();
    };
    qtyInput.addEventListener("change", check);
    qtyInput.addEventListener("blur", check);
  }

  // The rail's chevrons page it by three tiles. The Scroll Area keeps the wheel,
  // touch and keyboard scrolling; these are the coarse affordance over the tiles,
  // and each hides itself once the rail is against that end, so a chevron never
  // sits there doing nothing.
  const rail = document.querySelector("[data-pdp-rail]");
  const railView = rail && rail.querySelector(".scroll-area__viewport");
  if (rail && railView) {
    const steps = Array.from(rail.querySelectorAll("[data-pdp-rail-step]"));
    const tile = () => {
      const first = railView.querySelector(".pdp-thumb");
      return first ? first.getBoundingClientRect().height + 8 : 104;
    };
    const sync = () => {
      const room = railView.scrollHeight - railView.clientHeight;
      steps.forEach((b) => {
        const back = Number(b.dataset.pdpRailStep) < 0;
        // 1px of slack: a fractional scrollTop at an end still counts as the end.
        b.hidden = room <= 8 || (back ? railView.scrollTop <= 1 : railView.scrollTop >= room - 1);
      });
    };
    steps.forEach((b) =>
      b.addEventListener("click", () => {
        railView.scrollBy({ top: Number(b.dataset.pdpRailStep) * tile() * 3, behavior: "smooth" });
      })
    );
    railView.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    sync();
  }

  // Deep link from a Shop card: ?color=<slug> opens on that colourway.
  const asked = new URLSearchParams(location.search).get("color");
  const wanted = asked && inputs.find((i) => i.value === asked);
  if (wanted && !wanted.checked) {
    wanted.checked = true;
    render(wanted);
  }
})();
