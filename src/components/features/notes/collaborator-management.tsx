import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { UserPlus, X } from "lucide-react"
import type { Collaborator } from "@/components/features/notes/dialogs/share-dialog"

interface CollaboratorManagementProps {
  collaborators: Collaborator[]
  canManage: boolean
  isPublic: boolean
  onAddCollaborator: (username: string, role: Collaborator["role"]) => Promise<boolean>
  onUpdateCollaborator: (userId: string, role: Collaborator["role"]) => Promise<void>
  onRemoveCollaborator: (userId: string) => Promise<void>
}

export function CollaboratorManagement({
  collaborators,
  canManage,
  isPublic,
  onAddCollaborator,
  onUpdateCollaborator,
  onRemoveCollaborator,
}: CollaboratorManagementProps) {
  const [newUsername, setNewUsername] = useState("")
  const [newUserRole, setNewUserRole] = useState<Collaborator["role"]>("reader")
  const [pending, setPending] = useState(false)

  const sortedCollaborators = [...collaborators].sort((a, b) => a.username.localeCompare(b.username))

  const handleAdd = async () => {
    const username = newUsername.trim()
    if (!username || !canManage || pending) return
    setPending(true)
    try {
      const success = await onAddCollaborator(username, newUserRole)
      if (success) {
        setNewUsername("")
        setNewUserRole("reader")
      }
    } finally {
      setPending(false)
    }
  }

  const handleRoleChange = async (userId: string, role: Collaborator["role"]) => {
    if (!canManage || pending) return
    await onUpdateCollaborator(userId, role)
  }

  const handleRemove = async (userId: string) => {
    if (!canManage || pending) return
    setPending(true)
    try {
      await onRemoveCollaborator(userId)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Collaborators</Label>
        {!isPublic && (
          <span className="text-xs text-muted-foreground">
            Sharing a private note automatically makes it public.
          </span>
        )}
      </div>

      <div className="rounded-md border">
        <div className="divide-y">
          {sortedCollaborators.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">No collaborators yet.</div>
          ) : (
            sortedCollaborators.map((collaborator) => {
              const canEdit = collaborator.role === "editor"
              const badgeLabel = canEdit ? "Editor" : "Reader"
              return (
                <div
                  key={collaborator.userId}
                  className="flex w-full flex-wrap items-center gap-2 px-3 py-2"
                >
                  <span className="text-sm font-medium">{collaborator.username}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <Badge variant="secondary" className="min-w-16 justify-center text-xs">
                      {badgeLabel}
                    </Badge>
                    {canManage && (
                      <>
                        <Switch
                          checked={canEdit}
                          onCheckedChange={(checked) =>
                            void handleRoleChange(collaborator.userId, checked ? "editor" : "reader")
                          }
                          disabled={pending}
                          aria-label={`Toggle edit access for ${collaborator.username}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => void handleRemove(collaborator.userId)}
                          disabled={pending}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}

          {canManage && (
            <div className="flex w-full flex-wrap items-center gap-3 px-3 py-3">
              <Input
                placeholder="Add collaborator by username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="min-w-40 flex-1"
                disabled={pending}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void handleAdd()
                  }
                }}
              />
              <div className="ml-auto flex items-center gap-2">
                <Badge variant="secondary" className="min-w-16 justify-center text-xs">
                  {newUserRole === "editor" ? "Editor" : "Reader"}
                </Badge>
                <Switch
                  checked={newUserRole === "editor"}
                  onCheckedChange={(checked) => setNewUserRole(checked ? "editor" : "reader")}
                  disabled={pending}
                  aria-label="Toggle edit access for new collaborator"
                />
                <Button
                  onClick={handleAdd}
                  size="sm"
                  disabled={pending || !newUsername.trim()}
                  className="h-8 w-8 p-0"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}