"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { notify } from "@/lib/notifications"
import { useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useLiveblocksExtension, useIsEditorReady } from "@liveblocks/react-tiptap"
import { RoomProvider, useClient, ClientSideSuspense } from "@liveblocks/react/suspense"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { Note, NoteVisibility } from "@/convex/lib/note_helpers"
import { CharacterCount } from "@tiptap/extension-character-count"
import {MAX_NOTE_CONTENT_LENGTH} from "@/convex/lib/validation"

import { Markdown } from "@tiptap/markdown"
import { useNoteAutosave } from "@/components/features/notes/hooks/note-editor-hooks"
import { useNoteSharing } from "@/components/features/notes/hooks/note-sharing"
import { useNotePresence } from "@/components/features/notes/hooks/note-presence"
import { useNoteVersionHistory } from "@/components/features/notes/version/note-version-history"
import { useCursorPosition } from "@/components/features/notes/hooks/use-cursor-position"
import { usePrevious } from "@/hooks/use-previous"
import { NoteDialogs } from "@/components/features/notes/dialogs/note-dialogs"
import { NoteTitleEditor } from "./note-title-editor"
import { NoteContentEditor } from "./note-content-editor"
import { NoteToolbar } from "./note-toolbar"
import { NoteTagsManager } from "./note-tags-manager"
import { NotePresenceIndicator } from "./note-presence-indicator"
import { NoteEditorSkeleton } from "./note-editor-skeleton"
import { useWorkspaceData } from "@/components/features/workspace/workspace-data-context"
import {
  EditorCoreProvider,
  EditorCollaborationProvider,
  EditorVersionProvider,
  EditorActionsProvider,
  type EditorCoreContextValue,
  type EditorCollaborationContextValue,
  type EditorVersionContextValue,
  type EditorActionsContextValue,
} from "./contexts"

interface NoteEditorProps {
  note?: Note
  isActive?: boolean
}

export function NoteEditor({ note, isActive = true }: NoteEditorProps) {
  const { currentUser, tagNames, saveNote, duplicateNote, deleteNote } = useWorkspaceData()

  if (!note) {
    return null
  }

  return (
    <NoteEditorInner
      note={note}
      availableTags={tagNames}
      isActive={isActive}
      saveNote={saveNote}
      duplicateNote={duplicateNote}
      deleteNote={deleteNote}
      currentUser={currentUser}
    />
  )
}

interface NoteEditorInnerProps {
  note: Note
  availableTags: string[]
  isActive: boolean
  saveNote: (
    noteId: string,
    changes: Partial<Pick<Note, "title" | "content" | "tags" | "visibility">>,
    options?: { saveVersion?: boolean },
  ) => Promise<void>
  duplicateNote: (noteId: string) => Promise<void>
  deleteNote: (noteId: string) => Promise<void>
  currentUser: { id: string; username: string }
}

function NoteEditorInner(props: NoteEditorInnerProps) {
  const { note } = props
  const roomId = note.id

  return (
    <RoomProvider id={roomId}>
      <ClientSideSuspense fallback={<NoteEditorSkeleton />}>
        <NoteEditorRoomContent {...props} />
      </ClientSideSuspense>
    </RoomProvider>
  )
}

function NoteEditorRoomContent({
  note,
  availableTags,
  isActive,
  saveNote,
  duplicateNote,
  deleteNote,
  currentUser,
}: NoteEditorInnerProps) {
  // Local state enables optimistic updates: UI responds instantly to user actions,
  // then backend mutations sync to Convex. The useEffect below keeps local state
  // in sync when Convex subscriptions update (e.g., collaborator adds tags).
  const [tags, setTags] = useState<string[]>(note.tags)
  const [visibility, setVisibility] = useState<NoteVisibility>(note.visibility)
  const [isSaving, setIsSaving] = useState(false)
  const [isTagSaving, setIsTagSaving] = useState(false)

  const canEdit = note.canEdit
  const isOwner = currentUser.id === note.owner.id
  const deleteActionLabel = isOwner ? "Delete note" : "Leave note"
  const deleteDialogDescription = isOwner
    ? "This will permanently delete the note. This action cannot be undone."
    : "You will leave this shared note and lose access until you are re-invited."
  const deleteConfirmLabel = isOwner ? "Delete" : "Leave"
  const previousCanEdit = usePrevious(note.canEdit)

  const liveblocksClient = useClient()

  const noteId = note.id as Id<"notes">
  const previousVersion = usePrevious(note.version)

  const {
    shareData,
    handleChangeVisibility,
    handleAddCollaborator,
    handleUpdateCollaborator,
    handleRemoveCollaborator,
  } = useNoteSharing({
    noteId,
    noteTitle: note.title,
    isOwner,
    visibility,
    onVisibilityChange: setVisibility,
  })

  const createTagMutation = useMutation(api.tags.create)

  // Liveblocks extension for collaborative editing
  // The extension instance should be stable across re-renders
  const liveblocksExtension = useLiveblocksExtension({
    initialContent: note.content,
  })

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        // TipTap version: Liveblocks 3.10+ requires TipTap 3.x
        // Using official @tiptap/markdown extension (replaced community tiptap-markdown)
        // See: https://liveblocks.io/docs/guides/migrating-from-tiptap-2-to-3
        StarterKit.configure({ undoRedo: false }),
        liveblocksExtension,
        CharacterCount.configure({
          limit: MAX_NOTE_CONTENT_LENGTH,
          mode: "textSize",
        }),
        Markdown.configure({
          markedOptions: {
            gfm: true,     // GitHub Flavored Markdown (includes linkify)
            breaks: true,  // Convert \n to <br>
          },
        }),
      ],
      autofocus: false,
      editable: canEdit,
      editorProps: {
        attributes: {
          class: "min-h-lg bg-transparent focus:outline-none",
          style: "overflow-wrap: anywhere;",
        },
      },
    },
    [note.id],
  )

  // Check if editor is fully ready (Liveblocks connected + content synced)
  const isEditorReady = useIsEditorReady()

  // Manage cursor position across tab switches
  useCursorPosition({ editor, isActive, noteId: note.id })

  // Consolidated autosave hook - handles both title and content with single debounce timer
  const { title, setTitle, characterCount, markSubmittedTitle, markSubmittedContent, replaceTitle } = useNoteAutosave({
    editor,
    noteId: note.id,
    noteTitle: note.title,
    initialContent: note.content,
    canEdit,
    onSave: saveNote,
  })

  const tagOptions = useMemo(
    () => Array.from(new Set([...availableTags, ...note.tags])).sort((a, b) => a.localeCompare(b)),
    [availableTags, note.tags]
  )

  useEffect(() => {
    replaceTitle(note.title)
    setTags(note.tags)
    setVisibility(note.visibility)
    // Sync local state from Convex subscription updates (tags/visibility for optimistic UI).
    // setTags/setVisibility are stable React setState functions (intentionally omitted from deps).
    // Dialog state automatically resets on note change via NoteDialogProvider remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id, note.tags, note.visibility, replaceTitle])

  // Manage editor editable state and permission changes
  useEffect(() => {
    if (!editor) return

    // Permission changed - need to re-authenticate Liveblocks
    if (previousCanEdit !== undefined && note.canEdit !== previousCanEdit) {
      liveblocksClient.logout()
      editor.setEditable(note.canEdit)
      return
    }

    // Sync editable state (no permission change)
    if (editor.isEditable !== note.canEdit) {
      editor.setEditable(note.canEdit)
    }
  }, [editor, note.canEdit, previousCanEdit, isActive, liveblocksClient])

  useEffect(() => {
    if (isOwner) return

    if (previousVersion !== undefined && note.version !== previousVersion) {
      const displayTitle = note.title.trim() || "Untitled"
      notify({
        type: "note.updated",
        level: "info",
        message: `${note.owner.username} updated "${displayTitle}" (v${note.version}).`,
      })
    }
  }, [note.version, note.title, note.owner.username, isOwner, previousVersion])

  const handleSave = useCallback(async () => {
    if (!canEdit || !editor) return
    setIsSaving(true)
    try {
      const characters = editor.storage.characterCount.characters({ mode: "textSize" })
      if (characters > MAX_NOTE_CONTENT_LENGTH) {
        return
      }
      const markdown = editor.getMarkdown()
      const payload: Partial<Pick<Note, "title" | "content" | "tags" | "visibility">> = {
        title,
        content: markdown,
        visibility,
      }
      if (isOwner) {
        payload.tags = tags
      }
      await saveNote(note.id, payload, { saveVersion: true })
      markSubmittedTitle(title || "Untitled")
      markSubmittedContent(markdown)
      if (isOwner) {
        const displayTitle = title.trim() || "Untitled"
        notify({ type: "note.saved", level: "success", message: `Saved "${displayTitle}".` })
      }
    } finally {
      setIsSaving(false)
    }
  }, [canEdit, editor, isOwner, markSubmittedContent, markSubmittedTitle, note.id, saveNote, tags, title, visibility])

  useEffect(() => {
    if (!editor) return
    if (isActive) {
      requestAnimationFrame(() => {
        if (!editor.isDestroyed) {
          editor.commands.focus("end")
        }
      })
      return
    }
    if (editor.isFocused) {
      editor.commands.blur()
    }
  }, [editor, isActive])



  const { presenceChips } = useNotePresence({ currentUser })

  const {
    openVersionHistory,
    closeVersionHistory,
    versionItems,
    restoringVersionId,
    handleRestoreVersion,
  } = useNoteVersionHistory({
    noteId,
    isOwner,
    editor,
  })

  const handleAddTagToNote = useCallback(
    async (tagName: string) => {
      if (!isOwner || !tagName) return
      if (tags.includes(tagName)) {
        notify({ type: "tag.alreadyExists", level: "info", message: `Tag #${tagName} is already on this note.` })
        return
      }

      const previous = tags
      const updated = [...tags, tagName]
      setTags(updated)
      setIsTagSaving(true)
      try {
        await saveNote(
          note.id,
          {
            tags: updated,
          },
          { saveVersion: false },
        )
        notify({ type: "tag.added", level: "success", message: `Added #${tagName} to this note.` })
      } catch (err) {
        setTags(previous)
        notify(err, "Failed to update tags")
      } finally {
        setIsTagSaving(false)
      }
    },
    [isOwner, note.id, saveNote, tags],
  )

  const removeTagsFromNote = useCallback(
    async (tagsToRemove: string[]) => {
      if (!isOwner || tagsToRemove.length === 0) return
      const removalSet = new Set(tagsToRemove)
      const previousTags = tags
      const removedTags = previousTags.filter((tag) => removalSet.has(tag))
      if (removedTags.length === 0) {
        return
      }
      const updatedTags = tags.filter((tag) => !removalSet.has(tag))
      if (updatedTags.length === previousTags.length) {
        return
      }
      setTags(updatedTags)
      setIsTagSaving(true)
      try {
        await saveNote(
          note.id,
          {
            tags: updatedTags,
          },
          { saveVersion: false },
        )
        // Notify for each removed tag
        for (const tag of removedTags) {
          notify({ type: "tag.removed", level: "success", message: `Removed #${tag} from this note.` })
        }
      } catch (err) {
        setTags(previousTags)
        notify(err, "Failed to update tags")
      } finally {
        setIsTagSaving(false)
      }
    },
    [isOwner, note.id, saveNote, tags],
  )

  const handleRemoveSingleTag = useCallback(
    (tag: string) => {
      return removeTagsFromNote([tag])
    },
    [removeTagsFromNote],
  )

  const handleCreateTag = useCallback(
    async (tagName: string) => {
      if (!tagName || !isOwner || isTagSaving) return
      setIsTagSaving(true)
      try {
        await createTagMutation({ name: tagName })
        await handleAddTagToNote(tagName)
      } catch (err) {
        notify(err, "Failed to create tag")
      } finally {
        setIsTagSaving(false)
      }
    },
    [isOwner, createTagMutation, handleAddTagToNote, isTagSaving],
  )

  // Split context into 4 focused contexts
  const coreContextValue: EditorCoreContextValue = useMemo(
    () => ({
      note,
      currentUser,
      title,
      setTitle,
      editor,
      characterCount,
      canEdit,
      isOwner,
    }),
    [note, currentUser, title, setTitle, editor, characterCount, canEdit, isOwner],
  )

  const collaborationContextValue: EditorCollaborationContextValue = useMemo(
    () => ({
      tags,
      tagOptions,
      isTagSaving,
      handleAddTagToNote,
      handleRemoveSingleTag,
      handleCreateTag,
      visibility,
      shareData,
      handleChangeVisibility,
      handleAddCollaborator,
      handleUpdateCollaborator,
      handleRemoveCollaborator,
    }),
    [
      tags,
      tagOptions,
      isTagSaving,
      handleAddTagToNote,
      handleRemoveSingleTag,
      handleCreateTag,
      visibility,
      shareData,
      handleChangeVisibility,
      handleAddCollaborator,
      handleUpdateCollaborator,
      handleRemoveCollaborator,
    ],
  )

  const versionContextValue: EditorVersionContextValue = useMemo(
    () => ({
      openVersionHistory,
      closeVersionHistory,
      versionItems,
      restoringVersionId,
      handleRestoreVersion,
    }),
    [
      openVersionHistory,
      closeVersionHistory,
      versionItems,
      restoringVersionId,
      handleRestoreVersion,
    ],
  )

  const actionsContextValue: EditorActionsContextValue = useMemo(
    () => ({
      deleteMenuLabel: deleteActionLabel,
      deleteDialogTitle: deleteActionLabel,
      deleteDialogDescription,
      deleteConfirmLabel,
      handleDeleteNote: () => void deleteNote(note.id),
      isSaving,
      handleSave,
      handleDuplicate: () => void duplicateNote(note.id),
    }),
    [
      deleteActionLabel,
      deleteDialogDescription,
      deleteConfirmLabel,
      deleteNote,
      note.id,
      isSaving,
      handleSave,
      duplicateNote,
    ],
  )

  // Show skeleton during TipTap initialization and Liveblocks sync
  // When immediatelyRender: false, editor is null until client-side init completes
  // isEditorReady ensures Liveblocks connection and content are fully synced
  if (!editor || !isEditorReady) {
    return <NoteEditorSkeleton />
  }

  return (
    <EditorCoreProvider value={coreContextValue}>
      <EditorCollaborationProvider value={collaborationContextValue}>
        <EditorVersionProvider value={versionContextValue}>
          <EditorActionsProvider value={actionsContextValue}>
            <div className="h-full flex flex-col min-h-0">
              <div className="p-4">
                <NoteToolbar />
              </div>

              <div className="flex-1 p-6 flex flex-col overflow-hidden min-h-0 h-full">
                <div className="space-y-2 mb-6">
                  <NoteTitleEditor value={title} onChange={setTitle} disabled={!canEdit} />
                </div>

                <div className="flex-1 flex flex-col gap-3 min-h-0 h-full">
                  <NoteContentEditor editor={editor} characterCount={characterCount} />
                  <div className="flex flex-col gap-2 text-xs text-muted-foreground flex-shrink-0">
                    <NoteTagsManager />
                  </div>
                </div>
              </div>

              <NotePresenceIndicator presenceChips={presenceChips} />

              <NoteDialogs />
            </div>
          </EditorActionsProvider>
        </EditorVersionProvider>
      </EditorCollaborationProvider>
    </EditorCoreProvider>
  )
}