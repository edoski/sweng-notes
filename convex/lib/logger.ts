/**
 * Minimal logging service for unified, structured logging
 *
 * Usage:
 *   logger.info("User logged in", { userId: "123" })
 *   logger.error("Failed to save", { error: err.message })
 *
 *   const log = logger.withModule("liveblocks")
 *   log.warn("Room not found", { noteId })
 */

type LogLevel = "info" | "warn" | "error"
type LogContext = Record<string, unknown>

interface Logger {
  info(message: string, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  error(message: string, context?: LogContext): void
  withModule(moduleName: string): Logger
}

function createLogger(moduleName?: string): Logger {
  const log = (level: LogLevel, message: string, context?: LogContext) => {
    const timestamp = new Date().toISOString()
    const moduleTag = moduleName ? ` [${moduleName}]` : ""
    const ctx = context ? ` ${JSON.stringify(context)}` : ""

    const output = `[${timestamp}] [${level.toUpperCase()}]${moduleTag} ${message}${ctx}`

    if (level === "error") console.error(output)
    else if (level === "warn") console.warn(output)
    else console.log(output)
  }

  return {
    info: (message, context) => log("info", message, context),
    warn: (message, context) => log("warn", message, context),
    error: (message, context) => log("error", message, context),
    withModule: (name) => createLogger(name),
  }
}

export const logger = createLogger()