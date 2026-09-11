// Log out of one session, confirmed first.
//
// Signing out is the ordinary case for a session you no longer recognise, but
// one of these rows is the device you are reading on, so both go through a
// confirm rather than acting on the press. One dialog serves both: the pressed
// button carries its own title and text (data-logout-title/-text) and they are
// copied in on open, so the wording sits in the markup beside the session it
// describes. app.js owns the opening, closing, scroll lock and focus via
// data-dialog-open/close, and the toast via data-toast; this only fills the
// copy in and takes the row away afterwards.
(function () {
  const dialog = document.getElementById("logout-dialog");
  const list = document.querySelector(".login-list");
  const empty = document.querySelector(".login-empty");
  if (!dialog || !list || !empty) return;

  const titleSlot = dialog.querySelector("[data-logout-title-slot]");
  const textSlot = dialog.querySelector("[data-logout-text-slot]");
  const confirm = dialog.querySelector("[data-logout-confirm]");
  if (!titleSlot || !textSlot || !confirm) return;

  // The row the open came from. app.js opens the dialog from its own delegated
  // listener, registered before this one, so by the time this runs the dialog is
  // already showing; the copy still lands in the same task, before paint.
  let pending = null;

  document.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-logout-title]");
    if (!btn) return;
    pending = btn.closest(".login");
    titleSlot.textContent = btn.dataset.logoutTitle;
    textSlot.textContent = btn.dataset.logoutText;
  });

  confirm.addEventListener("click", () => {
    if (!pending) return;
    pending.remove();
    pending = null;
    // Nothing left to list, so say so rather than leaving the heading over a gap.
    empty.hidden = list.children.length > 0;
    list.hidden = !empty.hidden;
  });
})();
