import { useCallback, useMemo, useState } from "react"
import { notify } from "@/lib/notifications"
import { useMutation, useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { Note } from "@/convex/lib/note_helpers"
import type { VersionHistoryItem } from "./version-history"
import type { Editor } from "@tiptap/react"

import { useNoteDialog } from "@/contexts/note-dialog-context"
import { useConvexUserReady } from "@/components/shared/providers"

interface UseNoteVersionHistoryOptions {
  noteId: Id<"notes">
  note: Note
  currentUser: { id: string; username: string }
  isOwner: boolean
  editor: Editor | null
  replaceTitle: (title: string) => void
}

export function useNoteVersionHistory({
  noteId,
  note,
  currentUser,
  isOwner,
  editor,
  replaceTitle,
}: UseNoteVersionHistoryOptions) {
  const { isDialogOpen, openDialog, closeDialog } = useNoteDialog()
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null)
  const isConvexUserReady = useConvexUserReady()

  const showVersionHistory = isDialogOpen(noteId, "versionHistory")

  const versionsData = useQuery(
    api.versions.list,
    isConvexUserReady && isOwner && showVersionHistory ? { noteId } : "skip",
  )

  const versionItems = useMemo<VersionHistoryItem[]>(() => {
    if (!versionsData) return []
    const currentVersionId = note.activeVersionId
    return versionsData.map((version) => {
      const ownerLabel = version.ownerUsername === currentUser.username ? "You" : version.ownerUsername
      const isCurrent = currentVersionId
        ? version.id === currentVersionId
        : version.versionNumber === note.version
      return {
        id: version.id,
        versionNumber: version.versionNumber,
        owner: ownerLabel,
        createdAt: version.createdAt,
        title: version.title,
        snapshot: version.snapshot,
        isCurrent,
      }
    })
  }, [versionsData, note.activeVersionId, note.version, currentUser.username])

  const restoreVersionMutation = useMutation(api.versions.restore)

  const openVersionHistory = useCallback(() => {
    if (!isOwner) return
    openDialog(noteId, "versionHistory")
  }, [isOwner, noteId, openDialog])

  const closeVersionHistory = useCallback(() => {
    closeDialog(noteId)
  }, [closeDialog, noteId])

  const handleRestoreVersion = useCallback(
    async (version: VersionHistoryItem) => {
      setRestoringVersionId(version.id)
      const restoredTitle = version.title || "Untitled"
      try {
        await restoreVersionMutation({ noteId, versionId: version.id as Id<"noteVersions"> })
        closeVersionHistory()
        replaceTitle(restoredTitle)
        if (editor) {
          editor.commands.setContent(version.snapshot, true)
        }
        const displayTitle = restoredTitle.trim() || "Untitled"
        notify({
          type: "note.versionRestored",
          level: "success",
          message: `Restored "${displayTitle}" to version ${version.versionNumber}.`,
        })
      } catch (err) {
        notify(err, "Failed to restore version")
      } finally {
        setRestoringVersionId(null)
      }
    },
    [
      noteId,
      closeVersionHistory,
      editor,
      replaceTitle,
      restoreVersionMutation,
    ],
  )

  return {
    openVersionHistory,
    closeVersionHistory,
    versionItems,
    restoringVersionId,
    handleRestoreVersion,
  }
}
