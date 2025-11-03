"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Save, Plus, X } from "lucide-react"
import type { Note } from "@/hooks/use-workspace-data"
import { useWorkspaceData } from "@/components/features/workspace/workspace-data-context"

interface NoteEditorProps {
  note?: Note | null
}

export function NoteEditor({ note }: NoteEditorProps) {
  const { saveNote } = useWorkspaceData()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Track if there are unsaved changes
  const hasChanges =
    note && (
      title !== note.title ||
      content !== note.content ||
      JSON.stringify(tags) !== JSON.stringify(note.tags)
    )

  // Sync local state with note prop
  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setTags(note.tags)
    } else {
      setTitle("")
      setContent("")
      setTags([])
    }
  }, [note])

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setNewTag("")
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSave = async () => {
    if (!note || !hasChanges) return

    setIsSaving(true)
    try {
      await saveNote(note.id, {
        title,
        content,
        tags,
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!note) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Select a note to begin</p>
          <p className="text-sm">Choose a note from the list or create a new one.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with save button */}
      <div className="border-b bg-muted/20 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Owner: {note.owner.username}</span>
          <span>•</span>
          <span>Visibility: {note.visibility}</span>
          <span>•</span>
          <span>Tags: {note.tags.length > 0 ? note.tags.join(", ") : "None"}</span>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          size="sm"
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : hasChanges ? "Save changes" : "Saved"}
        </Button>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {/* Title editor */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className="text-3xl font-bold border-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />

          {/* Tag editor */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs gap-1">
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTag(newTag)
                  }
                }}
                placeholder="Add a tag..."
                className="max-w-xs text-sm"
                maxLength={50}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addTag(newTag)}
                disabled={!newTag.trim() || tags.includes(newTag.trim())}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content editor */}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start typing..."
            className="min-h-[500px] resize-none border-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-sm"
          />
        </div>
      </div>
    </div>
  )
}