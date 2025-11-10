/**
 * Focused editor contexts.
 *
 * The editor state has been split into 4 focused contexts:
 *
 * 1. **EditorCoreContext** - Core editor state
 *    - note, currentUser, title, editor, characterCount, permissions
 *    - Use: `useEditorCore()`
 *
 * 2. **EditorCollaborationContext** - Collaboration features
 *    - tags, sharing, visibility, collaborators, presence
 *    - Use: `useEditorCollaboration()`
 *
 * 3. **EditorVersionContext** - Version history
 *    - version list, restore, history dialog state
 *    - Use: `useEditorVersion()`
 *
 * 4. **EditorActionsContext** - Actions and dialogs
 *    - save, duplicate, delete, details/delete dialogs
 *    - Use: `useEditorActions()`
 *
 * Use the specific hooks to access only what you need for better performance.
 */

export * from "./editor-core-context"
export * from "./editor-collaboration-context"
export * from "./editor-version-context"
export * from "./editor-actions-context"
