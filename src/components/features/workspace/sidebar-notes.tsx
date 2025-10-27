"use client"

import { useContext, useState } from "react"
import { Plus, Globe, Lock, MoreHorizontal, StickyNote, Share, Copy, Info, Trash2, Tag } from "lucide-react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SidebarGroup, useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import type { MockNote } from "@/lib/mock-data"
import { WorkspaceActionsContext } from "./workspace-shell"
import { useWorkspaceData } from "./workspace-data-context"
import { formatTimestamp } from "@/lib/date-format"

function getVisibilityIcon(visibility: MockNote["visibility"]) {
  switch (visibility) {
    case "private":
      return <Lock className="h-3 w-3" />
    case "public":
      return <Globe className="h-3 w-3" />
    default:
      return null
  }
}

/**
 * Sprint 2 Version: Simplified SidebarNotes with mock data
 * - All actions are no-ops or placeholder messages
 * - Uses mock notes from context
 */
export function SidebarNotes() {
  const { notes, currentUser, activeNoteId, openNote } = useWorkspaceData()
  const workspaceActions = useContext(WorkspaceActionsContext)
  const currentUserId = currentUser.id
  const { state: sidebarState, setOpen } = useSidebar()
  const [accordionValue, setAccordionValue] = useState<string | null>("notes")
  const [pendingDeleteNoteId, setPendingDeleteNoteId] = useState<string | null>(null)

  const pendingDeleteNote = pendingDeleteNoteId
    ? notes.find((note) => note.id === pendingDeleteNoteId) ?? null
    : null

  const pendingDeleteIsOwner =
    pendingDeleteNote && currentUserId ? pendingDeleteNote.owner.id === currentUserId : false

  const deleteDialogTitle = pendingDeleteIsOwner ? "Delete note" : "Leave note"
  const deleteDialogDescription = pendingDeleteIsOwner
    ? "[Sprint 2] This would delete the note in a real backend (Sprint 3)."
    : "[Sprint 2] This would remove you from the shared note (Sprint 3)."
  const deleteDialogActionLabel = pendingDeleteIsOwner ? "Delete" : "Leave"

  return (
    <SidebarGroup
      className="group/notes min-h-0 overflow-hidden px-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-0"
      style={{ maxHeight: "50%" }}
    >
      <Accordion
        type="single"
        collapsible
        className="flex h-full min-h-0 flex-col"
        value={accordionValue ?? ""}
        onValueChange={(value) => setAccordionValue(value || null)}
      >
        <AccordionItem value="notes" className="flex h-full min-h-0 flex-col">
          <div className="flex w-full items-center gap-1.5 px-2 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:h-10">
            <AccordionTrigger
              aria-label="Notes"
              title="Notes"
              className="flex-1 px-2 text-sm font-medium text-muted-foreground [&>svg]:opacity-0 [&>svg]:transition-opacity focus-visible:[&>svg]:opacity-100 group-hover/notes:[&>svg]:opacity-100 data-[state=open]:[&>svg]:opacity-100 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:basis-auto group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:hover:bg-muted/40 group-data-[collapsible=icon]:hover:no-underline group-data-[collapsible=icon]:[&>svg]:hidden"
              onClick={(event) => {
                if (sidebarState === "collapsed") {
                  event.preventDefault()
                  setOpen(true)
                  setAccordionValue("notes")
                }
              }}
            >
              <span className="flex items-center gap-1.5">
                <StickyNote className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">NOTES</span>
              </span>
            </AccordionTrigger>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Create note"
              className="ml-auto h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/notes:opacity-100 group-data-[collapsible=icon]:hidden"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                workspaceActions?.openNewNote()
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <AccordionContent
            className="flex-1 space-y-1 overflow-y-auto px-2 pb-2 scrollbar-none group-data-[collapsible=icon]:hidden"
            style={{ flex: "1 1 0%", minHeight: 0, display: "flex", flexDirection: "column" }}
          >
            {notes.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-3">No notes match your filters.</p>
            ) : (
              notes.map((note) => {
                const isSelected = activeNoteId === note.id
                const isOwner = currentUserId ? note.owner.id === currentUserId : false
                const deleteLabel = isOwner ? "Delete note" : "Leave note"

                return (
                  <div
                    key={note.id}
                    className={cn(
                      "group flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                      isSelected ? "bg-muted" : "hover:bg-muted/70"
                    )}
                    onClick={() => openNote(note.id)}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex flex-1 flex-col gap-2 rounded border-0 bg-transparent p-0 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <p className="truncate font-medium text-sm text-foreground">{note.title || "Untitled"}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {getVisibilityIcon(note.visibility)}
                        <span>{currentUserId && note.owner.id === currentUserId ? "You" : note.owner.username}</span>
                      </div>
                    </button>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={(event) => {
                              event.stopPropagation()
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              console.log("[Sprint 2] Manage tags - coming in Sprint 3")
                            }}
                          >
                            <Tag className="mr-2 h-4 w-4" />
                            Manage tags
                          </DropdownMenuItem>
                          {isOwner ? (
                            <DropdownMenuItem
                              onSelect={(event) => {
                                event.preventDefault()
                                console.log("[Sprint 2] Share - coming in Sprint 3")
                              }}
                            >
                              <Share className="mr-2 h-4 w-4" />
                              Share
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              console.log("[Sprint 2] Details - coming in Sprint 3")
                            }}
                          >
                            <Info className="mr-2 h-4 w-4" />
                            Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              console.log("[Sprint 2] Duplicate - coming in Sprint 3")
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={(event) => {
                              event.preventDefault()
                              setPendingDeleteNoteId(note.id)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deleteLabel}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <span className="text-xs text-muted-foreground">{formatTimestamp(note.updatedAt)}</span>
                    </div>
                  </div>
                )
              })
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <AlertDialog open={Boolean(pendingDeleteNoteId)} onOpenChange={(open) => !open && setPendingDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{deleteDialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                console.log("[Sprint 2] Delete/leave note - mock action")
                setPendingDeleteNoteId(null)
              }}
            >
              {deleteDialogActionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarGroup>
  )
}
