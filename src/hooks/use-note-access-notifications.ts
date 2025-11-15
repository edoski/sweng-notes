import { useCallback, useEffect, useRef } from "react"
import { useQuery } from "convex/react"
import { usePrevious } from "@/hooks/use-previous"
import { notify } from "@/lib/notifications"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

// ============================================================================
// TYPES
// ============================================================================

export interface UseNoteAccessNotificationsParams {
  currentUser: { id: string } | null | undefined
}

// ============================================================================
// EXPORTED HOOK: Note Access Notifications
// ============================================================================

/**
 * Monitors the notePermissions table for access changes and displays notifications.
 *
 * **Implementation Strategy:**
 * Subscribes to the notePermissions table via `api.permissions.myPermissions`.
 * Compares permission IDs (not note IDs) between renders to detect changes.
 *
 * **Why this is mathematically sound:**
 * - Permission changes are tracked at the source of truth (notePermissions table)
 * - No heuristics needed (filter changes don't affect permission records)
 * - First render skips notifications (previousPermissions undefined)
 * - Subsequent renders: diff permission IDs to detect adds/removes
 *
 * @example
 * ```tsx
 * const { registerManualLeave } = useNoteAccessNotifications({
 *   currentUser: { id: "user123" },
 * })
 *
 * // When user manually leaves a shared note
 * await leaveNote(noteId)
 * registerManualLeave(noteId) // Suppress "access revoked" notification
 * ```
 */
export function useNoteAccessNotifications({
  currentUser,
}: UseNoteAccessNotificationsParams): {
  registerManualLeave: (noteId: Id<"notes">) => void
} {
  const permissions = useQuery(
    api.permissions.myPermissions,
    currentUser ? {} : "skip"
  )
  const previousPermissions = usePrevious(permissions)
  const manualActions = useRef<Set<string>>(new Set())

  const registerManualLeave = useCallback((noteId: Id<"notes">) => {
    manualActions.current.add(String(noteId))
  }, [])

  useEffect(() => {
    // Skip if no user or no permissions data
    if (!currentUser || !permissions) return

    // Skip if no previousPermissions (first render / page refresh)
    if (!previousPermissions) return

    // Map permissionId → role for role change detection
    const prevMap = new Map(previousPermissions.map((p) => [p.permissionId, p.role]))
    const currMap = new Map(permissions.map((p) => [p.permissionId, p.role]))

    // Notify for new shares
    for (const permission of permissions) {
      if (prevMap.has(permission.permissionId)) continue

      // Skip if note or owner was deleted
      if (!permission.noteTitle || !permission.ownerUsername) continue

      notify({
        type: "note.shared",
        level: "success",
        message: `@${permission.ownerUsername} shared "${permission.noteTitle}" with you.`,
      })
    }

    // Notify for role changes (permission exists in both but role differs)
    for (const permission of permissions) {
      const prevRole = prevMap.get(permission.permissionId)
      if (!prevRole) continue  // New share, already handled above

      // Check if role changed
      if (prevRole !== permission.role) {
        // Skip if note or owner was deleted
        if (!permission.noteTitle || !permission.ownerUsername) continue

        notify({
          type: "note.roleChanged",
          level: "info",
          message: `You're now a ${permission.role} on "${permission.noteTitle}".`,
        })
      }
    }

    // Notify for revocations (unless manual)
    for (const permission of previousPermissions) {
      if (currMap.has(permission.permissionId)) continue

      // Skip if this was a manual leave action
      if (manualActions.current.has(String(permission.noteId))) {
        manualActions.current.delete(String(permission.noteId))  // Cleanup to prevent memory leak
        continue
      }

      // Skip if note or owner was deleted
      if (!permission.noteTitle || !permission.ownerUsername) continue

      notify({
        type: "note.accessRevoked",
        level: "info",
        message: `Access to "${permission.noteTitle}" was revoked.`,
      })
    }
  }, [currentUser, permissions, previousPermissions])

  return { registerManualLeave }
}