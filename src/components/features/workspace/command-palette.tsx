"use client"

import React from "react"
import { Command } from "cmdk"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import type { Note } from "@/convex/lib/note_helpers"
import { CalendarIcon, Globe, Lock, Search, StickyNote, Tag as TagIcon, UserRound } from "lucide-react"
import type { DateFilter } from "@/components/features/workspace/types"
import { useCommandPaletteSearch } from "./hooks/use-command-palette-search"
import { useWorkspaceData } from "./workspace-data-context"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const {
    currentUser,
    searchQuery,
    setSearchQuery,
    selectedTags,
    toggleTag,
    selectedAuthor,
    setSelectedAuthor,
    selectedDate,
    setSelectedDate,
    clearFilters,
    openNote,
  } = useWorkspaceData()

  // Local command query (different from global search)
  const [query, setQuery] = React.useState("")

  const { results, describeDateFilter } = useCommandPaletteSearch(query)

  // Handle dialog close and reset query
  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setQuery("")
      }
      onOpenChange(newOpen)
    },
    [onOpenChange]
  )

  const handleSelectNote = (noteId: string) => {
    setQuery("")
    openNote(noteId)
    onOpenChange(false)
  }

  const handleToggleTag = (tag: string) => {
    setQuery("")
    setSearchQuery("")
    toggleTag(tag)
  }

  const handleFilterByAuthor = (author: Note["owner"]) => {
    const isApplied = selectedAuthor?.id === author.id
    const nextAuthor = isApplied ? null : { id: author.id, username: author.username }
    setQuery("")
    setSearchQuery("")
    setSelectedAuthor(nextAuthor)
  }

  const handleFilterByDate = (date: DateFilter) => {
    const isApplied = selectedDate?.key === date.key && (selectedDate?.mode ?? null) === (date.mode ?? null)
    const nextDate = isApplied ? null : date
    setQuery("")
    setSearchQuery("")
    setSelectedDate(nextDate)
  }

  const hasLocalQuery = query.trim().length > 0
  const hasGlobalSearch = searchQuery.trim().length > 0
  const shouldShowClearFilters =
    selectedTags.length > 0 || hasGlobalSearch || hasLocalQuery || Boolean(selectedAuthor) || Boolean(selectedDate)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
        </DialogHeader>

        <Command className="rounded-lg border-none" shouldFilter={false}>
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              placeholder="Search notes/tags/authors/dates..."
              value={query}
              onValueChange={setQuery}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="px-4 py-2 flex items-center justify-between text-xs text-muted-foreground border-b">
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <Badge key={`tag-${tag}`} variant="outline" className="flex items-center gap-1 text-xs">
                  <TagIcon className="h-3 w-3" />
                  #{tag}
                </Badge>
              ))}
              {selectedDate ? (
                <Badge
                  key={`date-${selectedDate.key}-${selectedDate.mode ?? "any"}`}
                  variant="outline"
                  className="flex items-center gap-1 text-xs"
                >
                  <CalendarIcon className="h-3 w-3" />
                  {describeDateFilter(selectedDate)}
                </Badge>
              ) : null}
              {selectedAuthor ? (
                <Badge key={`author-${selectedAuthor.id}`} variant="outline" className="flex items-center gap-1 text-xs">
                  <UserRound className="h-3 w-3" />
                  @{selectedAuthor.username}
                </Badge>
              ) : null}
            </div>
            {shouldShowClearFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  setQuery("")
                  clearFilters()
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No results found.</Command.Empty>

            {results.map((entry) => {
              if (entry.type === "note") {
                const { note } = entry
                const isOwner = note.owner.id === currentUser.id
                const ownerLabel = isOwner ? "You" : `@${note.owner.username}`
                const VisibilityIcon = note.visibility === "private" ? Lock : Globe
                return (
                  <Command.Item
                    key={entry.id}
                    value={entry.id}
                    onSelect={() => handleSelectNote(note.id)}
                    className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-left aria-selected:bg-muted cursor-pointer"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span className="mt-0.5 text-muted-foreground">
                        <StickyNote className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{note.title || "Untitled"}</p>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <VisibilityIcon className="h-3 w-3" />
                            {ownerLabel}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground max-w-xs">
                          {note.content || "No preview available"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                      <span>{format(note.updatedAt, "dd/MM/yy, HH:mm")}</span>
                    </div>
                  </Command.Item>
                )
              }

              if (entry.type === "author") {
                const isApplied = selectedAuthor?.id === entry.author.id
                return (
                  <Command.Item
                    key={entry.id}
                    value={entry.id}
                    onSelect={() => handleFilterByAuthor(entry.author)}
                    className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-left aria-selected:bg-muted cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn("mt-0.5", isApplied ? "text-destructive" : "text-muted-foreground")}>
                        <UserRound className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">@{entry.author.username}</p>
                      </div>
                    </div>
                    <div className={cn("text-xs font-medium", isApplied ? "text-destructive" : "text-muted-foreground")}>
                      Author
                    </div>
                  </Command.Item>
                )
              }

              if (entry.type === "date") {
                const isApplied =
                  selectedDate?.key === entry.date.key && (selectedDate?.mode ?? null) === (entry.date.mode ?? null)
                return (
                  <Command.Item
                    key={entry.id}
                    value={entry.id}
                    onSelect={() => handleFilterByDate(entry.date)}
                    className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-left aria-selected:bg-muted cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn("mt-0.5", isApplied ? "text-destructive" : "text-muted-foreground")}>
                        <CalendarIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{describeDateFilter(entry.date)}</p>
                      </div>
                    </div>
                    <div className={cn("text-xs font-medium", isApplied ? "text-destructive" : "text-muted-foreground")}>
                      {entry.date.mode === "created"
                        ? "Created"
                        : entry.date.mode === "modified"
                          ? "Modified"
                          : "Date"}
                    </div>
                  </Command.Item>
                )
              }

              const isSelected = selectedTags.includes(entry.tag)
              return (
                <Command.Item
                  key={entry.id}
                  value={entry.id}
                  onSelect={() => handleToggleTag(entry.tag)}
                  className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-left aria-selected:bg-muted cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn("mt-0.5", isSelected ? "text-destructive" : "text-muted-foreground")}>
                      <TagIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">#{entry.tag}</p>
                    </div>
                  </div>
                  <div className={cn("text-xs font-medium", isSelected ? "text-destructive" : "text-muted-foreground")}>
                    Tag
                  </div>
                </Command.Item>
              )
            })}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
