import { ConvexError } from "convex/values"
import { toast } from "sonner"

/**
 * Extract user-friendly error message from various error types
 */
function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ConvexError) return String(error.data)
  if (error instanceof Error) return error.message
  return fallback
}

/**
 * Type guard for NotificationEvent
 */
function isNotificationEvent(x: unknown): x is NotificationEvent {
  return !!x && typeof x === "object" && "type" in x && "level" in x && "message" in x
}

// Notification event types (simplified for Sprint 3)
type AuthEvent =
  | { type: "auth.signedIn"; level: "success"; message: string }
  | { type: "auth.signedOut"; level: "info"; message: string }

type NoteEvent =
  | { type: "note.saved"; level: "success"; message: string }
  | { type: "note.updated"; level: "info"; message: string }
  | { type: "note.deleted"; level: "success"; message: string }
  | { type: "note.duplicated"; level: "success"; message: string }

type TagEvent =
  | { type: "tag.renamed"; level: "success"; message: string }
  | { type: "tag.removed"; level: "success"; message: string }

type GenericEvent = { type: "error"; level: "error"; message: string }

export type NotificationEvent = AuthEvent | NoteEvent | TagEvent | GenericEvent

/**
 * Display a notification to the user
 *
 * @example
 * notify({ type: "note.saved", level: "success", message: "Note saved!" })
 *
 * @example
 * try {
 *   await saveNote()
 * } catch (err) {
 *   notify(err, "Failed to save note")
 * }
 */
export function notify(event: NotificationEvent): void
export function notify(error: unknown, fallback: string): void
export function notify(eventOrError: NotificationEvent | unknown, fallback?: string): void {
  if (isNotificationEvent(eventOrError)) {
    toast[eventOrError.level](eventOrError.message)
  } else {
    const message = getErrorMessage(eventOrError, fallback!)
    toast.error(message)
  }
}
