"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import type { NoteVisibility } from "@/convex/lib/note_helpers"
import { VisibilitySettings } from "@/components/features/notes/visibility-settings"
import { CollaboratorManagement } from "@/components/features/notes/collaborator-management"

export interface Collaborator {
  userId: string
  username: string
  role: "reader" | "editor"
  joinedAt: number
}

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  visibility: NoteVisibility
  collaborators: Collaborator[]
  canManage: boolean
  onChangeVisibility: (visibility: NoteVisibility) => Promise<void>
  onAddCollaborator: (username: string, role: Collaborator["role"]) => Promise<boolean>
  onUpdateCollaborator: (userId: string, role: Collaborator["role"]) => Promise<void>
  onRemoveCollaborator: (userId: string) => Promise<void>
}

export function ShareDialog({
  open,
  onOpenChange,
  visibility,
  collaborators,
  canManage,
  onChangeVisibility,
  onAddCollaborator,
  onUpdateCollaborator,
  onRemoveCollaborator,
}: ShareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Note</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <VisibilitySettings
            visibility={visibility}
            canManage={canManage}
            pending={false}
            onChangeVisibility={onChangeVisibility}
          />

          <Separator />

          <CollaboratorManagement
            collaborators={collaborators}
            canManage={canManage}
            isPublic={visibility === "public"}
            onAddCollaborator={onAddCollaborator}
            onUpdateCollaborator={onUpdateCollaborator}
            onRemoveCollaborator={onRemoveCollaborator}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}