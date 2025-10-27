"use client"

import type { MockNote } from "@/lib/mock-data"

interface NoteEditorEmptyProps {
  note?: MockNote | null
}

export function NoteEditor({ note }: NoteEditorEmptyProps) {
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
    <div className="h-full flex flex-col p-6 overflow-auto">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{note.title || "Untitled"}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Owner: {note.owner.username}</span>
            <span>•</span>
            <span>Visibility: {note.visibility}</span>
            <span>•</span>
            <span>Tags: {note.tags.length > 0 ? note.tags.join(", ") : "None"}</span>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted/20 p-4 rounded-md">
              {note.content || "No content"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}