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
 * Sprint 2 Version: New Note Dialog
 * - Full UI works (form, validation, tag management)
 * - Create button does nothing (backend in Sprint 3)
 */

interface NewNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewNoteDialog({ open, onOpenChange }: NewNoteDialogProps) {
  const { tagNames } = useWorkspaceData()
  const [title, setTitle] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")

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

    // Sprint 2: Just log and close, no actual creation
    console.log("[Sprint 2] Would create note:", { title, tags })
    console.log("[Sprint 2] Backend integration coming in Sprint 3")

    // Show alert
    alert(`[Sprint 2 Demo]\n\nNote creation UI works!\n\nTitle: "${title || "Untitled"}"\nTags: ${tags.join(", ") || "None"}\n\nBackend integration coming in Sprint 3.`)

    // Reset form
    setTitle("")
    setTags([])
    setNewTag("")
    onOpenChange(false)
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
            <div className="flex flex-wrap gap-1">
              {tagNames.map((tag) => {
                if (tags.includes(tag)) return null
                return (
                  <Button key={tag} type="button" variant="outline" size="sm" className="h-6 text-xs bg-transparent" onClick={() => addTag(tag)}>
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
            <Button type="submit">Create Note</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
