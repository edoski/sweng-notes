import { useCallback, useMemo } from "react"
import { notify } from "@/lib/notifications"
import { useMutation, useQueries } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { NoteVisibility } from "@/convex/lib/note_helpers"
import { useCollaboratorNotifications } from "./note-editor-hooks"

interface UseCollaboratorManagementOptions {
  noteId: Id<"notes">
  noteTitle: string
  isOwner: boolean
  visibility: NoteVisibility
  onVisibilityChange: (visibility: NoteVisibility) => void
}

export function useCollaboratorManagement({
  noteId,
  noteTitle,
  isOwner,
  visibility,
  onVisibilityChange,
}: UseCollaboratorManagementOptions) {
  const updateNoteMutation = useMutation(api.notes.mutations.update)
  const grantAccessMutation = useMutation(api.sharing.grantAccess)
  const revokeAccessMutation = useMutation(api.sharing.revokeAccess)

  const collaboratorQueries = useMemo(
    () =>
      ({
        collaborators: {
          query: api.sharing.listCollaborators,
          args: { noteId },
        },
      }) satisfies Parameters<typeof useQueries>[0],
    [noteId],
  )

  const collaboratorResults = useQueries(collaboratorQueries)
  const shareResult = collaboratorResults.collaborators
  const shareQueryError = shareResult instanceof Error ? shareResult : null
  const shareData =
    shareResult instanceof Error || shareResult === undefined
      ? undefined
      : (shareResult as typeof api.sharing.listCollaborators._returnType)

  const collaborators = useMemo(() => shareData?.collaborators ?? [], [shareData?.collaborators])

  const { registerManualRemoval } = useCollaboratorNotifications({
    collaborators,
    isOwner,
    noteTitle,
  })

  const handleAddCollaborator = useCallback(
    async (username: string, role: "reader" | "editor") => {
      try {
        // Auto-convert to public if adding collaborator to private note
        if (visibility === "private" && isOwner) {
          await updateNoteMutation({ noteId, visibility: "public" })
          onVisibilityChange("public")
        }

        const response = await grantAccessMutation({ noteId, username, role })

        const roleLabel = response.role === "editor" ? "can edit" : "can view"
        notify({
          type: "note.shared",
          level: "success",
          message: `Shared with @${response.username} (${roleLabel}).`,
        })
        return true
      } catch (err) {
        notify(err, "Failed to add collaborator")
        return false
      }
    },
    [
      visibility,
      isOwner,
      updateNoteMutation,
      noteId,
      onVisibilityChange,
      grantAccessMutation,
    ],
  )

  const handleUpdateCollaborator = useCallback(
    async (userId: string, role: "reader" | "editor") => {
      const collaborator = collaborators.find((c) => c.userId === userId)
      if (!collaborator) return

      try {
        await grantAccessMutation({ noteId, username: collaborator.username, role })

        notify({
          type: "note.roleChanged",
          level: "success",
          message: `@${collaborator.username} is now a ${role}.`,
        })
      } catch (err) {
        notify(err, "Failed to update collaborator")
      }
    },
    [collaborators, grantAccessMutation, noteId],
  )

  const handleRemoveCollaborator = useCallback(
    async (userId: string) => {
      const collaborator = collaborators.find((entry) => entry.userId === userId)
      try {
        registerManualRemoval(userId)
        await revokeAccessMutation({ noteId, userId: userId as Id<"users"> })
        const label = collaborator?.username ? `@${collaborator.username}` : "collaborator"
        notify({
          type: "note.accessRevoked",
          level: "success",
          message: `Removed ${label} from this note.`,
        })
      } catch (err) {
        notify(err, "Failed to remove collaborator")
      }
    },
    [collaborators, noteId, registerManualRemoval, revokeAccessMutation],
  )

  return {
    shareData,
    shareQueryError,
    collaborators,
    handleAddCollaborator,
    handleUpdateCollaborator,
    handleRemoveCollaborator,
    registerManualRemoval,
  }
}
