"use client"

import type React from "react"
import { createContext, useRef, useState } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { Button } from "@/components/ui/button"
import { Search, Trash2 } from "lucide-react"
import { SidebarFilters } from "./sidebar-filters"
import { NewNoteDialog } from "@/components/features/notes/dialogs/new-note-dialog"
import { CommandPalette } from "./command-palette"
import { SidebarNotes } from "./sidebar-notes"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { sidebarIconModeVariants, sidebarLayoutVariants } from "@/components/ui/sidebar/utils"
import { UserButton } from "@clerk/nextjs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useWorkspaceData } from "./workspace-data-context"
import { useRouter, useSearchParams } from "next/navigation"
import { useDeleteAccount } from "@/hooks/use-delete-account"

interface WorkspaceActionsContextValue {
  openNewNote: () => void
  openCommandPalette: () => void
  clearFilters: () => void
  activeFiltersCount: number
}

export const WorkspaceActionsContext = createContext<WorkspaceActionsContextValue | null>(null)
const sidebarTriggerButtonClasses =
  "h-8 w-8 rounded-md border border-border/60 bg-background/60 text-muted-foreground shadow-sm transition duration-200 hover:bg-muted/70 hover:text-foreground"

export function WorkspaceShell({ children, }: { children: React.ReactNode }) {
  const { searchQuery, selectedTags, selectedAuthor, selectedDate, clearFilters } = useWorkspaceData()
  const router = useRouter()
  const searchParams = useSearchParams()

  // New note dialog state from URL
  const newNoteOpen = searchParams.get("action") === "new-note"
  const openNewNoteDialog = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("action", "new-note")
    router.push(`/?${params.toString()}`)
  }
  const closeNewNoteDialog = () => {
    // Use searchParams (React state) for the latest URL state
    // router.push() updates searchParams synchronously before browser URL updates
    const params = new URLSearchParams(searchParams.toString())
    params.delete("action")
    const query = params.toString()
    router.push(query ? `/?${query}` : "/")
  }

  const [commandOpen, setCommandOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const { deleteAccount, isDeleting } = useDeleteAccount()
  const profileButtonRef = useRef<HTMLDivElement | null>(null)
  const activeFiltersCount =
    selectedTags.length + (searchQuery ? 1 : 0) + (selectedAuthor ? 1 : 0) + (selectedDate ? 1 : 0)

  // Keyboard shortcuts using react-hotkeys-hook
  useHotkeys("mod+k", (e) => {
    e.preventDefault()
    setCommandOpen((prev) => !prev)
  }, { enableOnFormTags: true, enableOnContentEditable: true })

  useHotkeys("mod+n", (e) => {
    e.preventDefault()
    openNewNoteDialog()
  }, { enableOnFormTags: true, enableOnContentEditable: true })

  useHotkeys("mod+p", (e) => {
    e.preventDefault()
    const trigger = profileButtonRef.current?.querySelector("button")
    trigger?.click()
  }, { enableOnContentEditable: true })

  const actionsValue: WorkspaceActionsContextValue = {
    openNewNote: openNewNoteDialog,
    openCommandPalette: () => setCommandOpen(true),
    clearFilters,
    activeFiltersCount,
  }

  return (
    <SidebarProvider>
      <WorkspaceActionsContext.Provider value={actionsValue}>
        <Sidebar collapsible="icon" className="border-border bg-muted/20 border-r">
          <SidebarContent className="p-0">
            <SidebarHeader className={cn(
              "flex flex-col gap-2 items-stretch pl-3 pr-2 py-3 border-b border-border/60",
              sidebarLayoutVariants({ spacing: "icon" }),
              sidebarIconModeVariants({ iconModeAlign: "center" })
            )}>
              <div className={cn(
                "flex justify-end",
                sidebarIconModeVariants({ iconModeAlign: "center" })
              )}>
                <SidebarTrigger className={cn(sidebarTriggerButtonClasses)} />
              </div>
              <Button
                variant="outline"
                size="sm"
                aria-label="Open command palette"
                title="Open command palette"
                className={cn(
                  "w-full items-center justify-between gap-2",
                  sidebarIconModeVariants({ iconModeSize: "square" }),
                  "group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:text-muted-foreground group-data-[collapsible=icon]:hover:bg-muted/40"
                )}
                onClick={() => setCommandOpen(true)}
              >
                <div className={cn(
                  "flex items-center gap-2 text-muted-foreground",
                  sidebarIconModeVariants({ hideInIconMode: false })
                )}>
                  <Search className="h-4 w-4 shrink-0" />
                  <span className={sidebarIconModeVariants({ hideInIconMode: true })}>Search</span>
                  {activeFiltersCount > 0 ? (
                    <span className={cn(
                      "rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground",
                      sidebarIconModeVariants({ hideInIconMode: true })
                    )}>
                      {activeFiltersCount}
                    </span>
                  ) : null}
                </div>
                <span className={cn(
                  "text-xs text-muted-foreground",
                  sidebarIconModeVariants({ hideInIconMode: true })
                )}>⌘K</span>
              </Button>
            </SidebarHeader>
            <div className={cn(
              "flex-1 overflow-hidden scrollbar-none pl-3 pr-2 pb-4 flex flex-col",
              sidebarLayoutVariants({ spacing: "tight" }),
              sidebarIconModeVariants({ iconModeAlign: "auto" })
            )}>
              <SidebarNotes />
              <SidebarFilters />
            </div>
          </SidebarContent>
          <SidebarFooter className={cn(
            "mt-auto border-t border-border/60 pl-3 pr-0",
            "group-data-[collapsible=icon]:border-t-0",
            sidebarLayoutVariants({ spacing: "tight" }),
            sidebarIconModeVariants({ iconModeAlign: "center" })
          )}>
            <div className={cn(
              "flex w-full items-center gap-2",
              sidebarIconModeVariants({ iconModeAlign: "center" }),
              "group-data-[collapsible=icon]:w-auto"
            )}>
              <div
                ref={profileButtonRef}
                className="flex-1 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:mx-auto"
              >
                <UserButton
                  showName
                  appearance={{
                    elements: {
                      rootBox: cn(
                        "w-full",
                        "group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:mx-auto"
                      ),
                      userButtonTrigger: cn(
                        "w-full items-center justify-start gap-3 rounded-lg px-3 py-3 text-left hover:bg-muted/40 transition",
                        sidebarIconModeVariants({ iconModeSize: "square" }),
                        "group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:mx-auto"
                      ),
                      userButtonAvatarBox: cn(
                        "order-1 h-8 w-8",
                        "group-data-[collapsible=icon]:mx-auto"
                      ),
                      userButtonOuterIdentifier: cn(
                        "order-2 text-sm font-medium !text-foreground",
                        sidebarIconModeVariants({ hideInIconMode: true })
                      ),
                      userButtonTriggerIdentifier: cn(
                        "order-2 text-sm font-medium !text-foreground",
                        sidebarIconModeVariants({ hideInIconMode: true })
                      ),
                      userButtonChevron: cn(
                        "h-4 w-4 text-muted-foreground",
                        sidebarIconModeVariants({ hideInIconMode: true })
                      ),
                      userButtonTriggerIcon: "group-data-[collapsible=icon]:mx-auto",
                    },
                  }}
                  userProfileMode="modal"
                >
                  <UserButton.MenuItems>
                    <UserButton.Action
                      label="Delete Account"
                      labelIcon={<Trash2 className="h-4 w-4" />}
                      onClick={() => setConfirmDeleteOpen(true)}
                    />
                  </UserButton.MenuItems>
                </UserButton>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="flex-1 min-h-0 flex flex-col">{children}</div>
        </SidebarInset>

        <NewNoteDialog
          open={newNoteOpen}
          onOpenChange={(open) => (open ? openNewNoteDialog() : closeNewNoteDialog())}
        />
        <CommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
        />

        <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete your account? This will permanently delete all your notes, tags, and shared collaborations. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  deleteAccount()
                }}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete Account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </WorkspaceActionsContext.Provider>
    </SidebarProvider>
  )
}