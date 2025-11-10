"use client"

import { useMemo } from "react"
import { useThreads } from "@liveblocks/react/suspense"
import { FloatingComposer, FloatingThreads, useIsEditorReady } from "@liveblocks/react-tiptap"
import type { Editor } from "@tiptap/react"
import type { ThreadData } from "@liveblocks/core"

interface NoteThreadsProps {
  editor: Editor | null
}

export function NoteThreads({ editor }: NoteThreadsProps) {
  const isEditorReady = useIsEditorReady()
  const { threads } = useThreads({ query: { resolved: false } }) as {
    threads: ThreadData<Liveblocks["ThreadMetadata"]>[]
  }

  const visibleThreads = useMemo(() => threads.filter((thread) => !thread.resolved), [threads])

  if (!editor || !isEditorReady) {
    return null
  }

  return (
    <>
      <FloatingThreads editor={editor} threads={visibleThreads} className="floating-threads" />
      <FloatingComposer editor={editor} className="floating-composer" />
    </>
  )
}
