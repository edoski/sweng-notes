import { useCallback, useMemo, useState } from "react"
import { notify } from "@/lib/notifications"
import { useMutation, useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { VersionHistoryItem } from "./version-history"
import type { Editor } from "@tiptap/react"

import { useNoteDialog } from "@/contexts/note-dialog-context"

interface UseNoteVersionHistoryOptions {
  noteId: Id<"notes">
  isOwner: boolean
  editor: Editor | null
}

export function useNoteVersionHistory({
  noteId,
  isOwner,
  editor,
}: UseNoteVersionHistoryOptions) {
  const { isDialogOpen, openDialog, closeDialog } = useNoteDialog()
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null)

  const showVersionHistory = isDialogOpen(noteId, "versionHistory")

  const versionsData = useQuery(
    api.versions.listForDisplay,
    isOwner && showVersionHistory ? { noteId } : "skip",
  )

  const versionItems = useMemo<VersionHistoryItem[]>(() => {
    if (!versionsData) return []
    return versionsData.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      owner: version.ownerLabel,
      createdAt: version.createdAt,
      title: version.title,
      snapshot: version.snapshot,
      isCurrent: version.isCurrent,
    }))
  }, [versionsData])

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
      try {
        await restoreVersionMutation({ noteId, versionId: version.id as Id<"noteVersions"> })
        closeVersionHistory()

        // Update editor content manually (Liveblocks manages this separately)
        if (editor) {
          editor.commands.setContent(version.snapshot, { contentType: 'markdown' })
        }

        // Title will update reactively via Convex useQuery
        const displayTitle = (version.title || "Untitled").trim() || "Untitled"
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
    [noteId, closeVersionHistory, editor, restoreVersionMutation],
  )

  return {
    openVersionHistory,
    closeVersionHistory,
    versionItems,
    restoringVersionId,
    handleRestoreVersion,
  }
}
