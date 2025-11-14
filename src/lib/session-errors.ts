import { ConvexError } from "convex/values"

export function isSessionExpiredError(error: unknown): boolean {
  const message =
    error instanceof ConvexError
      ? String(error.data)
      : error instanceof Error
        ? error.message
        : ""
  return message.toLowerCase().includes("session expired")
}
