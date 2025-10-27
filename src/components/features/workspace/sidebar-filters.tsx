"use client"

import { useMemo, useState } from "react"
import { Plus, MoreHorizontal, Trash2, Tag as TagIcon, Edit, Globe } from "lucide-react"
import { SidebarGroup, useSidebar } from "@/components/ui/sidebar"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useWorkspaceData } from "./workspace-data-context"

/**
 * Sprint 2 Version: Simplified SidebarFilters with mock tags
 * - All create/edit/delete actions are no-ops
 * - Tag filtering works (client-side)
 */
export function SidebarFilters() {
  const { tagSummaries, selectedTags, toggleTag } = useWorkspaceData()
  const { state: sidebarState, setOpen } = useSidebar()
  const [accordionValue, setAccordionValue] = useState<string | null>("tags")

  const sortedTags = useMemo(() => {
    return [...tagSummaries].sort((a, b) => a.name.localeCompare(b.name))
  }, [tagSummaries])

  return (
    <SidebarGroup
      className="group/tags min-h-0 overflow-hidden px-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-0"
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
                console.log("[Sprint 2] Create tag - coming in Sprint 3")
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <AccordionContent
            className="flex-1 space-y-1 overflow-y-auto px-2 pb-2 scrollbar-none group-data-[collapsible=icon]:hidden"
            style={{ flex: "1 1 0%", minHeight: 0, display: "flex", flexDirection: "column" }}
          >
            {sortedTags.map((tag) => (
              <div key={tag.name} className="relative">
                <div
                  className={`flex min-w-0 items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 group ${
                    selectedTags.includes(tag.name) ? "bg-muted" : ""
                  }`}
                  onClick={() => toggleTag(tag.name)}
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
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            console.log("[Sprint 2] Rename tag - coming in Sprint 3")
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => {
                            console.log("[Sprint 2] Delete tag - coming in Sprint 3")
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>
            ))}

            {sortedTags.length === 0 ? (
              <div className="px-2 py-4 text-xs text-muted-foreground">No tags have been created yet.</div>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SidebarGroup>
  )
}
