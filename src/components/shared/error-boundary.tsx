"use client"

import { ErrorBoundary as ReactErrorBoundary, type FallbackProps } from "react-error-boundary"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { logger } from "@/convex/lib/logger"

const log = logger.withModule("error-boundary")

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-destructive/50 bg-card p-8 text-center shadow-lg">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            We encountered an unexpected error. Please try again.
          </p>
        </div>
        <div className="space-y-3">
          <Button onClick={resetErrorBoundary} className="w-full" size="lg">
            Try again
          </Button>
          <details className="text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Error details
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs">
              {error.message}
            </pre>
          </details>
        </div>
      </div>
    </div>
  )
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export function ErrorBoundary({ children, onError }: ErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log the error
    log.error("Error boundary caught an error", { error, errorInfo })

    // Call custom error handler if provided
    onError?.(error, errorInfo)

    // Here you could also send to error tracking service (Sentry, etc.)
  }

  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => {
        // Reset the state of your app so the error doesn't happen again
        window.location.href = "/"
      }}
    >
      {children}
    </ReactErrorBoundary>
  )
}