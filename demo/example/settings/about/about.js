// About you, view ↔ edit toggle for the one contact card.
//
// "Edit" hides the definition list + edit button and reveals the form;
// Cancel/Save hide the form and show the list again. No backend, so Save just
// returns to the view (the typed values stay in the inputs). On open, focus
// moves to the form region (not the first field, the user hasn't said which
// field they want, and the Edit button that had focus is now hidden); the first
// Tab lands on the first input. On close, focus returns to the edit button.
(function () {
  const card = document.querySelector("[data-about-card]");
  if (!card) return;

  const view = card.querySelector("[data-about-view]");
  const editWrap = card.querySelector(".about-card__edit");
  const editBtn = card.querySelector("[data-about-edit]");
  const form = card.querySelector("[data-about-form]");
  const cancelBtn = card.querySelector("[data-about-cancel]");
  if (!view || !editWrap || !editBtn || !form || !cancelBtn) return;

  const setEditing = (editing) => {
    view.hidden = editing;
    editWrap.hidden = editing;
    form.hidden = !editing;
    if (editing) {
      form.focus();
    } else {
      editBtn.focus();
    }
  };

  editBtn.addEventListener("click", () => setEditing(true));
  cancelBtn.addEventListener("click", () => setEditing(false));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    // Block Save on a bad field, but never show the browser's native bubble
    // (reportValidity), it's unstyled and off-brand. Pressing Save already
    // blurred the field, so it's :user-invalid and our own red border +
    // message are showing; just focus the offender and keep the form open.
    const invalid = form.querySelector(":invalid");
    if (invalid) {
      invalid.focus();
      return;
    }
    setEditing(false);
  });
})();
