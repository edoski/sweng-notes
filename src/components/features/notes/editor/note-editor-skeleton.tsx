/**
 * Note Editor Skeleton
 *
 * Loading skeleton that matches the note editor layout exactly.
 */

import { Skeleton } from "@/components/ui/skeleton"

export function NoteEditorSkeleton() {
  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Toolbar skeleton - matches p-4 padding */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Left side: visibility icon + text + version badge */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-8 rounded-sm" />
          </div>

          {/* Right side: action buttons + menu */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-10 rounded-md" />
          </div>
        </div>
      </div>

      {/* Content area - matches p-6 padding */}
      <div className="flex-1 p-6 flex flex-col gap-3">
        {/* Title skeleton - full width to match real input */}
        <Skeleton className="h-9 mb-3 w-full rounded-md" />

        {/* Content skeleton - single large block representing the editor */}
        <Skeleton className="h-134.5 w-full rounded-md" />
      </div>
    </div>
  )
}