import { toast } from "sonner";
import { api } from "./api";

const UNDO_WINDOW_MS = 4000;

// Deletes a record after a short delay so an "Undo" toast action can cancel it.
// The backend has no soft-delete/restore endpoint, so undo re-creates the record
// from the snapshot captured before deletion (it gets a new id, which is fine since
// nothing else references these ids at delete time from the list pages that use this).
export function deleteWithUndo({ resource, record, label, onSettled }) {
  let undone = false;
  const timer = setTimeout(async () => {
    if (undone) return;
    try {
      await api.remove(resource, record.id);
    } finally {
      onSettled?.();
    }
  }, UNDO_WINDOW_MS);

  toast(`${label} deleted`, {
    action: {
      label: "Undo",
      onClick: async () => {
        undone = true;
        clearTimeout(timer);
        try {
          const { id, created_at, updated_at, ...rest } = record;
          await api.create(resource, rest);
          toast.success(`${label} restored`);
        } catch {
          toast.error("Could not restore — it may already be gone");
        } finally {
          onSettled?.();
        }
      },
    },
  });
}
