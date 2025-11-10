import { useCallback } from "react"
import { notify } from "@/lib/notifications"
import { useMutation } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { NoteVisibility } from "@/convex/lib/note_helpers"

interface UseNoteVisibilityOptions {
  noteId: Id<"notes">
  visibility: NoteVisibility
  onVisibilityChange: (visibility: NoteVisibility) => void
  onPrivateConversion?: (collaboratorIds: string[]) => void
}

export function useNoteVisibility({
  noteId,
  visibility,
  onVisibilityChange,
  onPrivateConversion,
}: UseNoteVisibilityOptions) {
  const updateNoteMutation = useMutation(api.notes.mutations.update)

  const handleChangeVisibility = useCallback(
    async (nextVisibility: NoteVisibility, collaboratorIds: string[] = []) => {
      try {
        await updateNoteMutation({ noteId, visibility: nextVisibility })
        onVisibilityChange(nextVisibility)
        if (nextVisibility === "private" && onPrivateConversion) {
          onPrivateConversion(collaboratorIds)
        }
      } catch (err) {
        notify(err, "Failed to update visibility")
      }
    },
    [noteId, onVisibilityChange, onPrivateConversion, updateNoteMutation],
  )

  return {
    currentVisibility: visibility,
    handleChangeVisibility,
  }
}
