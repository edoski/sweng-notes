"use client"

import { useMemo, useCallback } from "react"
import { RedirectToSignIn, useUser } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { WorkspaceShell } from "@/components/features/workspace/workspace-shell"
import { WorkspaceDataProvider } from "@/components/features/workspace/workspace-data-context"
import { NoteTabs } from "@/components/features/notes/note-tabs"
import { useWorkspaceData } from "@/hooks/use-workspace-data"
import { useWorkspaceActions } from "@/hooks/use-workspace-actions"
import { useWorkspaceUrlState } from "@/hooks/use-workspace-url-state"
import { usePersistedTabs } from "@/hooks/use-persisted-tabs"
import { useNoteAccessNotifications } from "@/hooks/use-note-access-notifications"
import { NoteDialogProvider } from "@/contexts/note-dialog-context"

function Workspace() {
  // Direct access to router and search params for URL manipulation
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL-based state (filters, active note)
  const urlState = useWorkspaceUrlState()

  // Persisted tabs (sessionStorage)
  const { openNotes, openNote: addToTabs, closeNote: removeFromTabs } = usePersistedTabs()

  // Destructure the specific values we need for stable callbacks
  const { activeNoteId, setActiveNoteId } = urlState

  // Wrapper to open a note: add to tabs AND set as active in URL
  const openNote = useCallback(
    (noteId: string) => {
      addToTabs(noteId)

      // Build URL params, explicitly clearing action to close any open dialogs
      // This prevents race conditions where setActiveNoteId would preserve the action=new-note parameter
      const params = new URLSearchParams(searchParams.toString())
      params.delete("action") // Clear dialog actions when opening a note
      params.set("note", noteId)

      const queryString = params.toString()
      router.push(queryString ? `/?${queryString}` : "/")
    },
    [addToTabs, router, searchParams],
  )

  // Wrapper to close a note: remove from tabs AND handle active note switching
  const closeNote = useCallback(
    (noteId: string) => {
      removeFromTabs(noteId)

      // If closing the active note, switch to another tab or clear active
      if (activeNoteId === noteId) {
        const remainingTabs = openNotes.filter((id) => id !== noteId)
        const newActiveNote = remainingTabs[remainingTabs.length - 1] ?? null
        setActiveNoteId(newActiveNote)
      }
    },
    [removeFromTabs, activeNoteId, setActiveNoteId, openNotes],
  )

  // Fetch all workspace data (queries)
  const { currentUser, notes, openNoteTabs, tagSummaries, tagNames } = useWorkspaceData({
    searchQuery: urlState.searchQuery,
    selectedTags: urlState.selectedTags,
    selectedAuthor: urlState.selectedAuthor,
    selectedDate: urlState.selectedDate,
    openNotes,
  })

  // Monitor notePermissions for sharing events
  const { registerManualLeave } = useNoteAccessNotifications({
    currentUser,
  })

  // Get all workspace actions (mutations) - pass in tab/filter actions
  const actions = useWorkspaceActions({
    openNote,
    closeNote,
    addToTabs,
    selectedTags: urlState.selectedTags,
    setSelectedTags: urlState.setSelectedTags,
    registerManualLeave,
  })

  // Build provider value
  const workspaceDataValue = useMemo(
    () => {
      if (!currentUser) {
        return null
      }
      return {
        currentUser,
        notes,
        allNotes: notes, // Pass unfiltered notes for command palette
        tagSummaries,
        tagNames,
        tabs: openNoteTabs,
        // Spread URL state
        ...urlState,
        // Spread tab actions
        openNote,
        closeNote,
        // Actions
        ...actions,
      }
    },
    [currentUser, notes, tagSummaries, tagNames, openNoteTabs, urlState, openNote, closeNote, actions],
  )

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

  return (
    <NoteDialogProvider>
      <Workspace />
    </NoteDialogProvider>
  )
}
