"use client"

import { ShareDialog } from "./share-dialog"
import { NoteDetailsDialog } from "./note-details-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { VersionHistory } from "@/components/features/notes/version/version-history"
import { useNoteDialog } from "@/contexts/note-dialog-context"
import { useEditorCore } from "@/components/features/notes/editor/contexts/editor-core-context"
import { useEditorCollaboration } from "@/components/features/notes/editor/contexts/editor-collaboration-context"
import { useEditorVersion } from "@/components/features/notes/editor/contexts/editor-version-context"
import { useEditorActions } from "@/components/features/notes/editor/contexts/editor-actions-context"

export function NoteDialogs() {
  // Read dialog state and handlers from NoteDialogContext
  const { isDialogOpen, openDialog, closeDialog } = useNoteDialog()

  const { note } = useEditorCore()
  const {
    visibility,
    shareData,
    handleChangeVisibility,
    handleAddCollaborator,
    handleUpdateCollaborator,
    handleRemoveCollaborator,
  } = useEditorCollaboration()
  const {
    openVersionHistory,
    closeVersionHistory,
    versionItems,
    restoringVersionId,
    handleRestoreVersion,
  } = useEditorVersion()
  const {
    handleDeleteNote,
    deleteDialogTitle,
    deleteDialogDescription,
    deleteConfirmLabel,
  } = useEditorActions()
  return (
    <>
      <ShareDialog
        open={isDialogOpen(note.id, "share")}
        onOpenChange={(open) => (open ? openDialog(note.id, "share") : closeDialog(note.id))}
        visibility={visibility}
        collaborators={shareData?.collaborators ?? []}
        canManage={shareData?.canManage ?? false}
        onChangeVisibility={handleChangeVisibility}
        onAddCollaborator={handleAddCollaborator}
        onUpdateCollaborator={handleUpdateCollaborator}
        onRemoveCollaborator={handleRemoveCollaborator}
      />
      <NoteDetailsDialog
        note={note}
        open={isDialogOpen(note.id, "details")}
        onOpenChange={(open) => (open ? openDialog(note.id, "details") : closeDialog(note.id))}
      />
      <AlertDialog open={isDialogOpen(note.id, "delete")} onOpenChange={(open) => (open ? openDialog(note.id, "delete") : closeDialog(note.id))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{deleteDialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                closeDialog(note.id)
                handleDeleteNote()
              }}
            >
              {deleteConfirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <VersionHistory
        open={isDialogOpen(note.id, "versionHistory")}
        onOpenChange={(open) => (open ? openVersionHistory() : closeVersionHistory())}
        versions={versionItems}
        onRestoreVersion={handleRestoreVersion}
        restoringVersionId={restoringVersionId}
      />
    </>
  )
}
