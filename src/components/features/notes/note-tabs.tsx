"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Note } from "@/convex/lib/note_helpers"
import { NoteEditor } from "@/components/features/notes/editor/note-editor"
import { useWorkspaceData } from "@/components/features/workspace/workspace-data-context"

export interface NoteTabEntry {
  id: string
  note: Note | null
  status: "loading" | "ready" | "error"
  error?: Error
}

export function NoteTabs() {
  const { tabs, activeNoteId, openNote, closeNote } = useWorkspaceData()
  const tabIds = tabs.map((entry) => entry.id)
  const effectiveActiveNoteId =
    activeNoteId && tabIds.includes(activeNoteId) ? activeNoteId : tabIds[tabIds.length - 1] ?? null

  if (tabs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium mb-2">No notes open</p>
          <p className="text-sm">Select a note from the sidebar, or open the command palette with ⌘/Ctrl + K</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="border-b border-border bg-muted/20">
        <div
          className="w-full overflow-x-scroll overflow-y-hidden whitespace-nowrap scrollbar-none "
        >
          <div className="flex w-max items-stretch">
            {tabs.map((tab) => {
              const { id: noteId, note, status } = tab
              const isActive = effectiveActiveNoteId === noteId
              const title = (() => {
                if (note?.title) return note.title
                if (status === "loading") return "Loading…"
                if (status === "error") return "Unavailable"
                return "Untitled"
              })()

              return (
                <div
                  key={noteId}
                  className={`relative flex w-[160px] flex-shrink-0 items-center gap-2 px-4 py-2 border-r border-border cursor-pointer transition-colors ${
                    isActive
                      ? "bg-background text-foreground"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                  onClick={() => openNote(noteId)}
                >
                  <span className="text-sm truncate flex-1 min-w-0">{title}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-4 w-4 p-0 hover:bg-muted-foreground/20 ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      closeNote(noteId)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  {isActive ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" /> : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {tabs.map((tab) => {
          const { id: noteId, note, status, error } = tab
          const isActive = effectiveActiveNoteId === noteId

          let content: ReactNode

          if (status === "error") {
            content = (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="space-y-3 text-center max-w-xs px-4">
                  <p className="text-sm font-medium">Unable to load this note.</p>
                  <p className="text-xs">
                    {error?.message ?? "You might have lost access or the note was deleted."}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => closeNote(noteId)}>
                    Close tab
                  </Button>
                </div>
              </div>
            )
          } else {
            content = (
              <NoteEditor
                note={note ?? undefined}
                isActive={isActive}
              />
            )
          }

          return (
            <div
              key={noteId}
              className={cn(
                "absolute inset-0 h-full w-full",
                isActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
              )}
              aria-hidden={isActive ? undefined : true}
            >
              {content}
            </div>
          )
        })}
        {!effectiveActiveNoteId && (
          <div className="absolute inset-0 h-full w-full">
            <NoteEditor
              note={undefined}
              isActive={false}
            />
          </div>
        )}
      </div>
    </div>
  )
}