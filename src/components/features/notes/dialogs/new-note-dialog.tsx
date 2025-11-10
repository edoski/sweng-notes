"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { notify } from "@/lib/notifications"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, Plus } from "lucide-react"
import {
  MAX_NOTE_TITLE_LENGTH as NOTE_TITLE_MAX_LENGTH,
  MAX_TAG_NAME_LENGTH as TAG_NAME_MAX_LENGTH,
} from "@/convex/lib/validation"
import { useWorkspaceData } from "@/components/features/workspace/workspace-data-context"

interface NewNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewNoteDialog({
  open,
  onOpenChange,
}: NewNoteDialogProps) {
  const { createNote, tagNames } = useWorkspaceData()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || open) {
      return
    }
    const timeout = window.setTimeout(() => {
      setTitle("")
      setContent("")
      setTags([])
      setNewTag("")
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [open])

  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag])
    }
    setNewTag("")
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  /**
   * Handles form submission for creating a new note.
   *
   * URL-driven dialog pattern: No explicit dialog close call needed. When createNote()
   * succeeds and calls openNote(), the action param is removed from the URL, causing
   * the dialog to close automatically via the URL-driven state system.
   *
   * Error handling: Catches errors from createNote() to preserve form data and allow
   * user to retry. The loading state (isSubmitting) is managed to prevent double submission.
   *
   * @see src/app/page.tsx:openNote() - Removes action param, closing dialog
   * @see src/hooks/use-workspace-actions.ts:handleCreateNote() - Re-throws errors for this handler
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await createNote({
        title,
        content,
        tags,
      })

      // Reset form state (dialog will close automatically when URL updates)
      setTitle("")
      setContent("")
      setTags([])
      setNewTag("")

      // Note: Dialog closes automatically when openNote() removes action param from URL
      // No onOpenChange(false) call needed - this was causing a race condition
    } catch (err) {
      notify(err, "Failed to create note")
      // Dialog stays open, form data preserved, user can retry
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Note</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, NOTE_TITLE_MAX_LENGTH))}
              maxLength={NOTE_TITLE_MAX_LENGTH}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-3 w-3 p-0 ml-1"
                    onClick={() => removeTag(tag)}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value.slice(0, TAG_NAME_MAX_LENGTH))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTag(newTag)
                  }
                }}
                maxLength={TAG_NAME_MAX_LENGTH}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addTag(newTag)}
                disabled={!newTag || tags.includes(newTag)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {tagNames.map((tag) => {
                if (tags.includes(tag)) return null
                return (
                  <Button
                    key={tag}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs bg-transparent"
                    onClick={() => addTag(tag)}
                  >
                    #{tag}
                  </Button>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}