"use client"

import { useEffect, useMemo } from "react"
import { useQuery } from "convex/react"
import { format } from "date-fns"
import { notify } from "@/lib/notifications"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Note } from "@/convex/lib/note_helpers"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { Collaborator } from "./share-dialog"

interface NoteDetailsDialogProps {
  note: Note
  open: boolean
  onOpenChange: (open: boolean) => void
}

function collaboratorCompare(a: Collaborator, b: Collaborator) {
  return a.username.localeCompare(b.username)
}

export function NoteDetailsDialog({ note, open, onOpenChange }: NoteDetailsDialogProps) {
  const noteId = note.id as unknown as Id<"notes">

  const shareResult = useQuery(
    api.sharing.listCollaborators,
    open ? { noteId } : "skip"
  )
  const shareQueryError = shareResult instanceof Error ? shareResult : null
  const shareInfo = shareResult instanceof Error || shareResult === undefined ? undefined : shareResult

  useEffect(() => {
    if (shareQueryError) {
      notify(shareQueryError, "Failed to load collaborators")
    }
  }, [shareQueryError])
  const ownerId = shareInfo?.owner?.userId ?? null
  const collaborators: Collaborator[] = shareInfo?.collaborators
    ? [...shareInfo.collaborators]
        .filter((collaborator) => !ownerId || collaborator.userId !== ownerId)
        .sort((a, b) => collaboratorCompare(a, b))
    : []
  const sortedTags = useMemo(() => {
    return [...note.tags]
      .sort((a, b) => a.localeCompare(b))
      .map(tag => ({ original: tag, display: tag }))
  }, [note.tags])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Note details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 overflow-hidden">
            <div className="space-y-1 min-w-0">
              <p className="text-sm text-muted-foreground">Title</p>
              <p
                className="text-sm font-medium truncate overflow-x-clip max-w-sm"
                title={note.title || "Untitled"}
              >
                {note.title || "Untitled"}
              </p>
            </div>
            <Badge variant="secondary" className="text-xs h-6 px-2 flex-shrink-0">
              v{note.version}
            </Badge>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1 min-w-0">
              <p className="text-muted-foreground">Owner</p>
              <p className="font-medium truncate overflow-x-clip" title={`@${note.owner.username}`}>
                @{note.owner.username}
              </p>
            </div>
            <div className="space-y-1 min-w-0">
              <p className="text-muted-foreground">Visibility</p>
              <p className="font-medium capitalize truncate overflow-x-clip" title={note.visibility}>
                {note.visibility}
              </p>
            </div>
            <div className="space-y-1 min-w-0">
              <p className="text-muted-foreground">Role</p>
              <p className="font-medium capitalize truncate overflow-x-clip" title={note.sharedRole}>
                {note.sharedRole}
              </p>
            </div>
            <div className="space-y-1 min-w-0">
              <p className="text-muted-foreground">Can edit</p>
              <p className="font-medium truncate overflow-x-clip" title={note.canEdit ? "Yes" : "No"}>
                {note.canEdit ? "Yes" : "No"}
              </p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1 min-w-0">
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium truncate overflow-x-clip" title={format(note.createdAt, "dd/MM/yyyy, HH:mm")}>
                {format(note.createdAt, "dd/MM/yyyy, HH:mm")}
              </p>
            </div>
            <div className="space-y-1 min-w-0">
              <p className="text-muted-foreground">Last updated</p>
              <p className="font-medium truncate overflow-x-clip" title={format(note.updatedAt, "dd/MM/yyyy, HH:mm")}>
                {format(note.updatedAt, "dd/MM/yyyy, HH:mm")}
              </p>
            </div>
          </div>
          {collaborators.length > 0 ? (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Collaborators</p>
                <div className="space-y-1">
                  {collaborators.map((collaborator) => (
                    <div key={collaborator.userId} className="flex items-center justify-between gap-2 text-sm min-w-0">
                      <span
                        className="font-medium truncate overflow-x-clip"
                        title={`@${collaborator.username}`}
                      >
                        @{collaborator.username}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">{collaborator.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
          <Separator />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Tags</p>
            {sortedTags.length > 0 ? (
              <div className="flex flex-wrap gap-2 overflow-y-auto scrollbar-none h-20">
                {sortedTags.map((tag) => (
                  <Badge
                    key={tag.original}
                    variant="outline"
                    className="max-w-40 h-8 overflow-hidden text-xs"
                    title={tag.original}
                  >
                    <span className="truncate overflow-x-clip whitespace-nowrap flex-1">
                      #{tag.display}
                    </span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tags</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}