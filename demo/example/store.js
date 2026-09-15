// The store the reader has chosen, shared across the example's pages.
//
// Choosing one on a product page filters the listing to it, and the listing's
// own picker answers the product page back: it is one question ("which shop can
// I walk into"), so it is asked once and remembered. Slug only, the same token
// the store lists and the product cards already carry, so the pages stay the
// place the stores are described and this only says which of them is current.
//
// Private browsing and blocked site data make every one of these throw, so each
// is wrapped: losing the memory means the picker opens unchosen, which is the
// state a first visit is in anyway.
window.exampleStore = (function () {
  const KEY = "example-store";

  const read = () => {
    try {
      return localStorage.getItem(KEY) || "";
    } catch {
      return "";
    }
  };

  const write = (slug) => {
    try {
      if (slug) localStorage.setItem(KEY, slug);
      else localStorage.removeItem(KEY);
    } catch {
      // Nothing to do: the page keeps its own selection for this visit.
    }
  };

  return { read, write };
})();
