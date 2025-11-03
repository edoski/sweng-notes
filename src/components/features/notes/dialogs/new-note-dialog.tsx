"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, Plus } from "lucide-react"
import { useWorkspaceData } from "@/components/features/workspace/workspace-data-context"

/**
 * Sprint 3 Version: New Note Dialog
 * - Full UI works (form, validation, tag management)
 * - Create button calls real Convex mutation
 */

interface NewNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewNoteDialog({ open, onOpenChange }: NewNoteDialogProps) {
  const { createNote } = useWorkspaceData()
  const [title, setTitle] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || open) {
      return
    }
    const timeout = window.setTimeout(() => {
      setTitle("")
      setTags([])
      setNewTag("")
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [open])

  const addTag = (tag: string) => {
    if (!tags.includes(tag) && tag.trim()) {
      setTags([...tags, tag.trim()])
    }
    setNewTag("")
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsCreating(true)
    try {
      // Call real Convex mutation
      await createNote({
        title: title || "Untitled",
        content: "",
        tags,
      })

      // Reset form
      setTitle("")
      setTags([])
      setNewTag("")
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to create note:", error)
    } finally {
      setIsCreating(false)
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
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                  <Button type="button" variant="ghost" size="sm" className="h-3 w-3 p-0 ml-1" onClick={() => removeTag(tag)}>
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value.slice(0, 50))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTag(newTag)
                  }
                }}
                maxLength={50}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addTag(newTag)} disabled={!newTag || tags.includes(newTag)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Type tag names and press Enter or click + to add</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
