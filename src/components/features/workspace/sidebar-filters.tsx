"use client"

import type { FormEvent } from "react"
import { useState } from "react"
import { notify } from "@/lib/notifications"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Label } from "@/components/ui/label"
import { Plus, MoreHorizontal, Trash2, Tag as TagIcon, Edit, Globe } from "lucide-react"
import { SidebarGroup, useSidebar } from "@/components/ui/sidebar"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useWorkspaceData } from "./workspace-data-context"
import {
  MAX_TAG_NAME_LENGTH as TAG_NAME_MAX_LENGTH,
} from "@/convex/lib/validation"

export function SidebarFilters() {
  const { tagSummaries, createTag, deleteTag, renameTag, selectedTags, toggleTag } = useWorkspaceData()
  const { state: sidebarState, setOpen } = useSidebar()
  const [isCreateTagOpen, setIsCreateTagOpen] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [editTagName, setEditTagName] = useState("")
  const [accordionValue, setAccordionValue] = useState<string | null>("tags")

  const handleCreateTag = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newTagName) return
    if (tagSummaries.some((tag) => tag.name === newTagName && !tag.shared)) {
      notify({ type: "tag.alreadyExists", level: "error", message: `Tag "${newTagName}" already exists.` })
      return
    }
    await createTag({ name: newTagName })
    setNewTagName("")
    setIsCreateTagOpen(false)
  }

  const handleRenameTag = (tag: string) => {
    if (!editTagName || editTagName === tag) {
      setEditingTag(null)
      setEditTagName("")
      return
    }
    if (tagSummaries.some((t) => t.name === editTagName)) {
      notify({ type: "tag.alreadyExists", level: "error", message: `Tag "${editTagName}" already exists.` })
      setEditingTag(null)
      setEditTagName("")
      return
    }
    void renameTag(tag, editTagName)
    setEditingTag(null)
    setEditTagName("")
  }

  return (
    <SidebarGroup
      className="group/tags min-h-0 overflow-hidden px-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-start group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-0"
      style={{ maxHeight: "50%" }}
    >
      <Accordion
        type="single"
        collapsible
        className="flex h-full min-h-0 w-full flex-col"
        value={accordionValue ?? ""}
        onValueChange={(value) => setAccordionValue(value || null)}
      >
        <AccordionItem value="tags" className="flex h-full min-h-0 flex-col">
          <div className="group/tags flex w-full items-center gap-1.5 px-2 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:h-10">
            <AccordionTrigger
              aria-label="Tags"
              title="Tags"
              className="flex-1 px-2 text-sm font-medium text-muted-foreground [&>svg]:opacity-0 [&>svg]:transition-opacity focus-visible:[&>svg]:opacity-100 group-hover/tags:[&>svg]:opacity-100 data-[state=open]:[&>svg]:opacity-100 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:basis-auto group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:hover:bg-muted/40 group-data-[collapsible=icon]:hover:no-underline group-data-[collapsible=icon]:[&>svg]:hidden"
              onClick={(event) => {
                if (sidebarState === "collapsed") {
                  event.preventDefault()
                  setOpen(true)
                  setAccordionValue("tags")
                }
              }}
            >
              <span className="flex items-center gap-1.5">
                <TagIcon className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">TAGS</span>
              </span>
            </AccordionTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-6 w-6 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/tags:opacity-100 group-data-[collapsible=icon]:hidden"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setNewTagName("")
                setIsCreateTagOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <AccordionContent
            className="flex-1 space-y-1 overflow-y-auto px-2 pb-2 scrollbar-none group-data-[collapsible=icon]:hidden"
            style={{ flex: "1 1 0%", minHeight: 0, display: "flex", flexDirection: "column" }}
          >
            {tagSummaries.map((tag) => (
              <div key={tag.name} className="relative">
                {editingTag === tag.name ? (
                  <div className="px-2">
                    <Input
                      value={editTagName}
                      onChange={(event) => setEditTagName(event.target.value.slice(0, TAG_NAME_MAX_LENGTH))}
                      className="h-8 text-sm"
                      maxLength={TAG_NAME_MAX_LENGTH}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          handleRenameTag(tag.name)
                        }
                        if (event.key === "Escape") {
                          setEditingTag(null)
                          setEditTagName("")
                        }
                      }}
                      onBlur={() => handleRenameTag(tag.name)}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div
                    className={`flex min-w-0 items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 group ${
                      selectedTags.includes(tag.name) ? "bg-muted" : ""
                    }`}
                    onClick={(event) => {
                      // Prevent tag toggle when clicking menu button/items
                      const target = event.target as HTMLElement
                      if (target.closest('[data-tag-action]')) return

                      toggleTag(tag.name)
                    }}
                    onContextMenu={(event) => event.preventDefault()}
                  >
                    <TagIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm flex-1 truncate overflow-x-clip" title={tag.name}>
                      {tag.name}
                    </span>
                    {tag.shared ? (
                      <span className="flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                        <Globe className="h-3 w-3" />
                        SHARED
                      </span>
                    ) : null}
                    {!tag.shared ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 text-muted-foreground"
                            data-tag-action="true"
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                            }}
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            data-tag-action="true"
                            onSelect={(e) => {
                              e.stopPropagation()
                              setEditingTag(tag.name)
                              setEditTagName(tag.name.slice(0, TAG_NAME_MAX_LENGTH))
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            data-tag-action="true"
                            className="text-destructive"
                            onSelect={(e) => {
                              e.stopPropagation()
                              setShowDeleteConfirm(tag.name)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                )}
              </div>
            ))}

            {tagSummaries.length === 0 ? (
              <div className="px-2 py-4 text-xs text-muted-foreground">
                No tags have been created yet.
              </div>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog
        open={isCreateTagOpen}
        onOpenChange={(open) => {
          setIsCreateTagOpen(open)
          if (!open) {
            setNewTagName("")
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create tag</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTag} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sidebar-new-tag">Tag name</Label>
              <Input
                id="sidebar-new-tag"
                placeholder="e.g. planning"
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value.slice(0, TAG_NAME_MAX_LENGTH))}
                maxLength={TAG_NAME_MAX_LENGTH}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateTagOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newTagName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(showDeleteConfirm)} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag</AlertDialogTitle>
            <AlertDialogDescription>
              {showDeleteConfirm ? (
                <span>
                  Remove <span className="font-medium">{showDeleteConfirm}</span>? Existing notes will simply lose this tag.
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (showDeleteConfirm) {
                  void deleteTag({ name: showDeleteConfirm })
                  setShowDeleteConfirm(null)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarGroup>
  )
}