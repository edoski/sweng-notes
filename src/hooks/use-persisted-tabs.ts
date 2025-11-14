"use client"

import { useState, useEffect, useCallback } from "react"

export const STORAGE_KEY = "workspace:openNotes"

/**
 * Manages open note tabs with session persistence.
 *
 * Uses sessionStorage to persist open tabs across page refreshes but
 * clears them when the browser is closed. This provides a good balance:
 * - Survives accidental refresh
 * - Doesn't clutter state across sessions
 * - Browser-native behavior (session scope)
 */
export function usePersistedTabs() {
  const [openNotes, setOpenNotesState] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // Persist to sessionStorage on change
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(openNotes))
    } catch {
      // Ignore quota errors
    }
  }, [openNotes])

  const openNote = useCallback((noteId: string) => {
    setOpenNotesState((prev) => {
      if (prev.includes(noteId)) return prev
      return [...prev, noteId]
    })
  }, [])

  const closeNote = useCallback((noteId: string) => {
    setOpenNotesState((prev) => prev.filter((id) => id !== noteId))
  }, [])

  const clearAllTabs = useCallback(() => {
    setOpenNotesState([])
  }, [])

  return {
    openNotes,
    openNote,
    closeNote,
    clearAllTabs,
  }
}