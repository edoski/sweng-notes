"use client"

import { EditorContent, Editor } from "@tiptap/react"
import { FloatingToolbar, useIsEditorReady } from "@liveblocks/react-tiptap"
import { NoteThreads } from "./note-threads"
import { MAX_NOTE_CONTENT_LENGTH } from "@/convex/lib/validation"

interface NoteContentEditorProps {
  editor: Editor | null // TipTap editor instance
  characterCount?: number
}

/**
 * TipTap editor with Liveblocks collaboration features.
 * Liveblocks components are deferred until editor is ready to avoid flushSync warnings in React 19.
 * Mentions are restricted to public notes and only show collaborators.
 */
export function NoteContentEditor({ editor, characterCount }: NoteContentEditorProps) {
  const isEditorReady = useIsEditorReady()

  return (
    <div className="relative mb-5 flex-1 min-h-0 h-full rounded-md border border-transparent bg-muted/40">
      <div className="editor h-full">
        {editor ? (
          <>
            <EditorContent editor={editor} className="tiptap editor-surface" />
            {isEditorReady && (
              <>
                <NoteThreads editor={editor} />
                <FloatingToolbar editor={editor} />
              </>
            )}
          </>
        ) : null}
      </div>
      <div className="flex justify-end mt-2">
        <span className={`text-xs ${characterCount && characterCount > MAX_NOTE_CONTENT_LENGTH * 0.9 ? "text-orange-500" : "text-muted-foreground"}`}>
          {characterCount}/{MAX_NOTE_CONTENT_LENGTH}
        </span>
      </div>
    </div>
  )
}