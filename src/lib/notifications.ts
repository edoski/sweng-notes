import { ConvexError } from "convex/values"
import { toast } from "sonner"
import { isSessionExpiredError } from "./session-errors"

/**
 * Extracts a user-friendly error message from various error types.
 *
 * Handles all possible error types thrown by JavaScript/TypeScript code:
 * - ConvexError: Extracts structured error data from backend
 * - Standard Error objects: Extracts the message property
 * - Primitives (null, undefined, string, number, etc.): Uses fallback
 *
 * @param error - Any thrown value (ConvexError, Error, string, null, undefined, etc.)
 * @param fallback - Message to use when error cannot be parsed
 * @returns Human-readable error message safe for display
 *
 * @example
 * getErrorMessage(new Error("Network failed"), "Unknown error")
 * // Returns: "Network failed"
 *
 * @example
 * getErrorMessage(new ConvexError("Not found"), "Unknown error")
 * // Returns: "Not found"
 *
 * @example
 * getErrorMessage(null, "Unknown error")
 * // Returns: "Unknown error"
 */
function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ConvexError) return String(error.data)
  if (error instanceof Error) return error.message
  return fallback
}

/**
 * Type guard to distinguish NotificationEvent objects from error values.
 *
 * Checks for presence of required properties: type, level, message.
 * Excludes null, primitives, arrays, and error objects.
 *
 * Logic breakdown:
 * - `!!x` - Excludes null and undefined (truthy check)
 * - `typeof x === "object"` - Ensures it's an object (includes arrays, excludes primitives)
 * - `"type" in x` - Has type property (required for NotificationEvent)
 * - `"level" in x` - Has level property (required for NotificationEvent)
 * - `"message" in x` - Has message property (required for NotificationEvent)
 *
 * Note: While Error objects have a "message" property, they lack "type" and "level",
 * so they correctly fail this guard and are treated as errors for parsing.
 *
 * @param x - Value to check (typically passed to notify())
 * @returns true if x is a NotificationEvent, false otherwise
 */
function isNotificationEvent(x: unknown): x is NotificationEvent {
  return !!x && typeof x === "object" && "type" in x && "level" in x && "message" in x
}

// Notification event types
type AuthEvent =
  | { type: "auth.signedIn"; level: "success"; message: string }
  | { type: "auth.signedOut"; level: "info"; message: string }

type NoteEvent =
  | { type: "note.shared"; level: "success"; message: string }
  | { type: "note.accessRevoked"; level: "success" | "info"; message: string }
  | { type: "note.roleChanged"; level: "success" | "info"; message: string }
  | { type: "note.saved"; level: "success"; message: string }
  | { type: "note.updated"; level: "info"; message: string }
  | { type: "note.deleted"; level: "success"; message: string }
  | { type: "note.duplicated"; level: "success"; message: string }
  | { type: "note.versionRestored"; level: "success"; message: string }
  | { type: "note.left"; level: "info"; message: string }

type TagEvent =
  | { type: "tag.added"; level: "success"; message: string }
  | { type: "tag.removed"; level: "success"; message: string }
  | { type: "tag.alreadyExists"; level: "error" | "info"; message: string }

type GenericEvent = { type: "error"; level: "error"; message: string }

export type NotificationEvent =
  | AuthEvent
  | NoteEvent
  | TagEvent
  | GenericEvent

/**
 * Display a notification to the user.
 *
 * @overload Display a structured notification event
 * @param event - Typed notification event with type, level, and message
 *
 * @overload Display an error notification
 * @param error - Any error object or value
 * @param fallback - Fallback message if error can't be parsed (required)
 *
 * @example
 * // Structured events
 * notify({ type: "note.saved", level: "success", message: "Note saved!" })
 *
 * // Error handling
 * try {
 *   await saveNote()
 * } catch (err) {
 *   notify(err, "Failed to save note")
 * }
 */
export function notify(event: NotificationEvent): void
export function notify(error: unknown, fallback: string): void
export function notify(eventOrError: NotificationEvent | unknown, fallback?: string): void {
  // Detect session expiry and redirect to login
  if (!isNotificationEvent(eventOrError) && isSessionExpiredError(eventOrError)) {
    window.location.href = "/login"
    return
  }

  if (isNotificationEvent(eventOrError)) {
    toast[eventOrError.level](eventOrError.message)
  } else {
    const message = getErrorMessage(eventOrError, fallback!)
    toast.error(message)
  }
}