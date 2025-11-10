import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User } from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"
import type { VersionHistoryItem } from "./version-history"

interface VersionListProps {
  versions: VersionHistoryItem[]
  onRestoreVersion?: (version: VersionHistoryItem) => Promise<void> | void
  restoringVersionId?: string | null
  error?: string | null
  errorVersionId?: string | null
}

export function VersionList({
  versions,
  onRestoreVersion,
  restoringVersionId,
  error,
  errorVersionId,
}: VersionListProps) {
  const initialIndex = useMemo(() => {
    if (versions.length === 0) return 0
    const currentIndex = versions.findIndex((version) => version.isCurrent)
    return currentIndex >= 0 ? currentIndex : versions.length - 1
  }, [versions])

  const carouselKey = useMemo(
    () => versions.map((version) => version.id).join("-") || "empty",
    [versions],
  )

  const [api, setApi] = useState<CarouselApi | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(initialIndex)

  useEffect(() => {
    if (!api) return
    const handleSelect = () => {
      setSelectedIndex(api.selectedScrollSnap())
    }
    handleSelect()
    api.on("select", handleSelect)
    return () => {
      api.off("select", handleSelect)
    }
  }, [api])

  useEffect(() => {
    if (!api || typeof window === "undefined") return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        api.scrollPrev()
      }
      if (event.key === "ArrowRight") {
        event.preventDefault()
        api.scrollNext()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [api])

  if (versions.length === 0) {
    return <p className="text-sm text-muted-foreground">No version history yet.</p>
  }

  return (
    <div className="flex flex-1 flex-col">
      <Carousel
        key={carouselKey}
        setApi={setApi}
        className="relative flex-1"
        opts={{ align: "start", startIndex: initialIndex }}
      >
        <CarouselContent className="h-full items-stretch">
          {versions.map((version) => {
            const isCurrent = version.isCurrent
            const isRestoring = restoringVersionId === version.id
            return (
              <CarouselItem key={version.id} className="flex w-full justify-center pl-4">
                <div
                  className={cn(
                    "flex h-full w-full max-w-3xl flex-col gap-5 rounded-lg border bg-background p-6",
                    isCurrent ? "border-primary" : "border-border",
                  )}
                >
                  <header className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={isCurrent ? "default" : "secondary"} className="text-xs">
                        v{version.versionNumber}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Saved on {format(version.createdAt, "dd/MM/yyyy, HH:mm")}</span>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h3 className="truncate text-base font-semibold leading-tight">
                        {version.title || "Untitled"}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{version.owner}</span>
                      </div>
                    </div>
                  </header>
                  <div className="grow overflow-auto rounded-md border border-dashed bg-muted/20 p-4">
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                      {version.snapshot ? version.snapshot : "(Empty note)"}
                    </p>
                  </div>
                  <footer className="flex items-center justify-between gap-4">
                    {error && errorVersionId === version.id ? (
                      <p className="text-sm text-destructive">{error}</p>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Version {version.versionNumber} of {versions.length}
                      </span>
                    )}
                    {onRestoreVersion ? (
                      <Button
                        variant="default"
                        onClick={() => onRestoreVersion(version)}
                        disabled={isCurrent || isRestoring}
                      >
                        {isRestoring ? "Restoring..." : isCurrent ? "Current" : "Restore"}
                      </Button>
                    ) : null}
                  </footer>
                </div>
              </CarouselItem>
            )
          })}
        </CarouselContent>
        <CarouselPrevious className="left-2 top-1/2 -translate-y-1/2" />
        <CarouselNext className="right-2 top-1/2 -translate-y-1/2" />
      </Carousel>

      <div className="mt-6 flex items-center justify-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          {versions.map((version, index) => (
            <span
              key={version.id}
              className={cn(
                "h-1.5 w-6 rounded-full bg-muted-foreground/40 transition-opacity",
                index === selectedIndex ? "opacity-100" : "opacity-50",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
