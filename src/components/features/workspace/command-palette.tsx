"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search } from "lucide-react"

/**
 * Sprint 2 Version: Simplified CommandPalette
 * Just shows a placeholder message - full search comes in Sprint 3
 */

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
        </DialogHeader>

        <div className="p-8 text-center space-y-4">
          <div className="flex justify-center mb-4">
            <Search className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Search & Command Palette</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Full command palette with note search, tag filtering, and quick actions will be available in Sprint 3.
          </p>
          <p className="text-xs text-muted-foreground">
            For now, use the sidebar to navigate notes and filter by tags.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
