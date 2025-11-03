"use client"

import { useMemo, useCallback } from "react"
import { RedirectToSignIn, useUser } from "@clerk/nextjs"
import { WorkspaceShell } from "@/components/features/workspace/workspace-shell"
import { WorkspaceDataProvider } from "@/components/features/workspace/workspace-data-context"
import { NoteTabs } from "@/components/features/notes/note-tabs"
import { useWorkspaceData } from "@/hooks/use-workspace-data"
import { useWorkspaceActions } from "@/hooks/use-workspace-actions"
import { useWorkspaceUrlState } from "@/hooks/use-workspace-url-state"
import { usePersistedTabs } from "@/hooks/use-persisted-tabs"

/**
 * Sprint 2 Version: Simplified Workspace Page
 * - Uses mock data instead of Convex
 * - Clerk authentication still works
 * - UI fully functional but no backend interactions
 */

function Workspace() {
  // URL-based state (filters, active note)
  const urlState = useWorkspaceUrlState()

  // Persisted tabs (sessionStorage)
  const { openNotes, openNote: addToTabs, closeNote: removeFromTabs } = usePersistedTabs()

  // Wrapper to open a note: add to tabs AND set as active in URL
  const openNote = useCallback(
    (noteId: string) => {
      addToTabs(noteId)
      urlState.setActiveNoteId(noteId)
    },
    [addToTabs, urlState]
  )

  // Wrapper to close a note: remove from tabs AND handle active note switching
  const closeNote = useCallback(
    (noteId: string) => {
      removeFromTabs(noteId)

      // If closing the active note, switch to another tab or clear active
      if (urlState.activeNoteId === noteId) {
        const remainingTabs = openNotes.filter((id) => id !== noteId)
        const newActiveNote = remainingTabs[remainingTabs.length - 1] ?? null
        urlState.setActiveNoteId(newActiveNote)
      }
    },
    [removeFromTabs, urlState, openNotes]
  )

  // Fetch all workspace data (real version)
  const { currentUser, notes, isNotesLoading, openNoteTabs } = useWorkspaceData({
    searchQuery: urlState.searchQuery,
    selectedTags: [], // No tag filtering in Sprint 3
    selectedAuthor: urlState.selectedAuthor,
    selectedDate: urlState.selectedDate,
    openNotes,
  })

  // Get all workspace actions (real version)
  const actions = useWorkspaceActions({
    openNote,
    closeNote,
  })

  // Build provider value
  const workspaceDataValue = useMemo(() => {
    if (!currentUser) {
      return null
    }
    return {
      currentUser,
      notes,
      tabs: openNoteTabs,
      // Spread URL state
      ...urlState,
      // Spread tab actions
      openNote,
      closeNote,
      // Actions
      ...actions,
    }
  }, [currentUser, notes, openNoteTabs, urlState, openNote, closeNote, actions])

  if (!workspaceDataValue) {
    return null
  }

  return (
    <WorkspaceDataProvider value={workspaceDataValue}>
      <WorkspaceShell>
        <div className="flex-1 min-h-0">
          <NoteTabs />
        </div>
      </WorkspaceShell>
    </WorkspaceDataProvider>
  )
}

export default function WorkspacePage() {
  const { isLoaded, isSignedIn } = useUser()

  if (!isLoaded) return null
  if (!isSignedIn) return <RedirectToSignIn />

  return <Workspace />
}