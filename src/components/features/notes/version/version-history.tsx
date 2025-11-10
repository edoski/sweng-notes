"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { History } from "lucide-react"
import { VersionList } from "./version-list"

export interface VersionHistoryItem {
  id: string
  versionNumber: number
  owner: string
  createdAt: number
  title: string
  snapshot: string
  isCurrent?: boolean
}

interface VersionHistoryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  versions: VersionHistoryItem[]
  onRestoreVersion?: (version: VersionHistoryItem) => Promise<void> | void
  restoringVersionId?: string | null
}

export function VersionHistory({
  open,
  onOpenChange,
  versions,
  onRestoreVersion,
  restoringVersionId,
}: VersionHistoryProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex min-h-96 w-full max-w-4xl flex-col gap-5 border-none bg-transparent p-0 shadow-none"
      >
        <DialogHeader className="items-center px-4 pt-6 text-center">
          <DialogTitle className="flex items-center justify-center gap-3 text-xl font-semibold leading-none">
            <History className="h-5 w-5" />
            Version History
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-full w-full flex-1 flex-col gap-4 px-4 pb-6">
          <VersionList
            versions={versions}
            onRestoreVersion={onRestoreVersion}
            restoringVersionId={restoringVersionId}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
