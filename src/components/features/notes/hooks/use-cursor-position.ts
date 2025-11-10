import { useEffect, useRef } from "react"
import type { Editor } from "@tiptap/react"

interface UseCursorPositionOptions {
  editor: Editor | null
  isActive: boolean
  noteId: string
}

/**
 * Manages cursor position across tab switches
 * Tracks and restores cursor position when switching between notes
 */
export function useCursorPosition({ editor, isActive, noteId }: UseCursorPositionOptions) {
  const cursorPositionRef = useRef<number | null>(null)

  // Track cursor position when editor is active and focused
  useEffect(() => {
    if (!editor || !isActive) return

    const handleSelectionUpdate = ({ editor: currentEditor }: { editor: Editor }) => {
      if (isActive && currentEditor.isFocused) {
        cursorPositionRef.current = currentEditor.state.selection.head
      }
    }

    editor.on("selectionUpdate", handleSelectionUpdate)
    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate)
    }
  }, [editor, isActive])

  // Reset cursor position when switching notes
  useEffect(() => {
    cursorPositionRef.current = null
  }, [noteId])

  // Initialize and restore cursor position when tab becomes active
  useEffect(() => {
    if (!editor || !isActive) return

    const handle = window.setTimeout(() => {
      // Only restore if we have a saved position
      if (cursorPositionRef.current !== null) {
        editor.commands.setTextSelection(cursorPositionRef.current)
      }
    }, 0)

    return () => window.clearTimeout(handle)
  }, [editor, isActive, noteId])
}
