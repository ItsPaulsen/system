import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogActions,
  DialogClose
} from "./Dialog";

export function DeleteProjectDialog() {
  return (
    <Dialog>
      <DialogTrigger className="button button--secondary">Open dialog</DialogTrigger>
      <DialogContent>
        <DialogTitle>Delete project?</DialogTitle>
        <DialogDescription>
          This permanently deletes the project and everything in it. You can't undo this.
        </DialogDescription>
        <DialogActions>
          <DialogClose className="button button--secondary">Cancel</DialogClose>
          <DialogClose className="button button--destructive">Delete</DialogClose>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
