"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Save, Share, History, Copy, MoreHorizontal, Lock, Globe, Tag, Trash2, Info } from "lucide-react"
import { useNoteDialog } from "@/contexts/note-dialog-context"
import { useEditorCore } from "./contexts/editor-core-context"
import { useEditorCollaboration } from "./contexts/editor-collaboration-context"
import { useEditorVersion } from "./contexts/editor-version-context"
import { useEditorActions } from "./contexts/editor-actions-context"

export function NoteToolbar() {
  const { openDialog } = useNoteDialog()
  const { note, isOwner, canEdit } = useEditorCore()
  const { visibility } = useEditorCollaboration()
  const { openVersionHistory } = useEditorVersion()
  const { isSaving, handleSave, handleDuplicate, deleteMenuLabel } = useEditorActions()
  const getVisibilityIcon = () => {
    switch (visibility) {
      case "private":
        return <Lock className="h-4 w-4" />
      case "public":
        return <Globe className="h-4 w-4" />
    }
  }

  const getVisibilityLabel = () => {
    switch (visibility) {
      case "private":
        return "Private"
      case "public":
        return "Public"
    }
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {getVisibilityIcon()}
        <span className="text-sm text-muted-foreground">{getVisibilityLabel()}</span>
        <Badge variant="secondary" className="text-xs">
          v{note.version}
        </Badge>
        {!isOwner && !canEdit ? <Badge variant="outline" className="text-xs">Read-only</Badge> : null}
      </div>

      <div className="flex items-center gap-2">
        {isOwner && (
          <Button variant="outline" size="sm" onClick={openVersionHistory}>
            <History className="h-4 w-4 mr-1" />
            History
          </Button>
        )}
        {isOwner ? (
          <>
            <Button variant="outline" size="sm" onClick={() => openDialog(note.id, "share")}>
              <Share className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={isSaving}>
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={!isOwner}
              onSelect={(event) => {
                event.preventDefault()
                if (isOwner) {
                  openDialog(note.id, "tags")
                }
              }}
            >
              <Tag className="h-4 w-4 mr-2" />
              Manage tags
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!isOwner}
              onSelect={(event) => {
                event.preventDefault()
                if (isOwner) openDialog(note.id, "share")
              }}
            >
              <Share className="h-4 w-4 mr-2" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault()
                openDialog(note.id, "details")
              }}
            >
              <Info className="h-4 w-4 mr-2" />
              Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault()
                void handleDuplicate()
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={(event) => {
                event.preventDefault()
                openDialog(note.id, "delete")
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteMenuLabel}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}