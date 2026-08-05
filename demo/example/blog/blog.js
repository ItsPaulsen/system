// Blog filter placement — one source of truth for the filter UI.
//
// There's a single .blog-filter node. Above 1024 it sits in the listing grid as
// the left rail; at/below 1024 the rail is replaced by a Filter button and the
// same node is relocated into the left sheet, so its state (open groups, checked
// boxes) survives the move. Mirrors the 1025px breakpoint in blog.css. The sheet
// open/close/focus is handled by the generic dialog wiring in app.js.
(function () {
  const filter = document.querySelector(".blog-filter");
  const rail = document.querySelector(".blog__inner");
  const main = document.querySelector(".blog__main");
  const sheetBody = document.querySelector("[data-blog-filter-slot]");
  if (!filter || !rail || !main || !sheetBody) return;

  const desktop = window.matchMedia("(min-width: 1025px)");

  const place = () => {
    if (desktop.matches) {
      // Rail: filter returns to the grid, ahead of the posts column.
      if (filter.parentElement !== rail) rail.insertBefore(filter, main);
    } else if (filter.parentElement !== sheetBody) {
      // Drawer: filter lives inside the sheet body.
      sheetBody.append(filter);
    }
  };

  place();
  desktop.addEventListener("change", place);
})();
