"use client"

import Image from "next/image"

interface PresenceChip {
  userId: string
  label: string
  avatar?: string
}

interface NotePresenceIndicatorProps {
  presenceChips: PresenceChip[]
}

export function NotePresenceIndicator({ presenceChips }: NotePresenceIndicatorProps) {
  return (
    <div className="mt-auto p-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 text-green-500 font-semibold">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
          <span>Connected</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 min-h-5">
          {presenceChips.map((entry) => (
            <span
              key={entry.userId}
              className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500"
            >
              {entry.avatar && (
                <Image
                  src={entry.avatar}
                  alt={entry.label}
                  width={16}
                  height={16}
                  className="h-4.5 w-4.5 rounded-full"
                  unoptimized
                />
              )}
              {entry.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}