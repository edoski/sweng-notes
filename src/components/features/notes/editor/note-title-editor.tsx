"use client"

import { Input } from "@/components/ui/input"
import { MAX_NOTE_TITLE_LENGTH as NOTE_TITLE_MAX_LENGTH } from "@/convex/lib/validation"

interface NoteTitleEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function NoteTitleEditor({ value, onChange, disabled = false }: NoteTitleEditorProps) {
  return (
    <Input
      placeholder="Note title..."
      value={value}
      onChange={(e) => onChange(e.target.value.slice(0, NOTE_TITLE_MAX_LENGTH))}
      maxLength={NOTE_TITLE_MAX_LENGTH}
      className="text-lg font-medium border-0 px-4 py-3 focus-visible:ring-0 placeholder:text-muted-foreground bg-muted/40 rounded-md"
      disabled={disabled}
    />
  )
}
