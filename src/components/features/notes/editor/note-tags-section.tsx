import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"
import {
  MAX_TAG_NAME_LENGTH as TAG_NAME_MAX_LENGTH,
  TagNameSchema,
} from "@/convex/lib/validation"

interface NoteTagsSectionProps {
  tags: string[]
  tagOptions: string[]
  isOwner: boolean
  isTagSaving: boolean
  isDialogOpen: boolean
  onDialogOpenChange: (open: boolean) => void
  onAddTag: (tag: string) => void | Promise<void>
  onRemoveTag: (tag: string) => void | Promise<void>
  onCreateTag: (tag: string) => void | Promise<void>
}

export function NoteTagsSection({
  tags,
  tagOptions,
  isOwner,
  isTagSaving,
  isDialogOpen,
  onDialogOpenChange,
  onAddTag,
  onRemoveTag,
  onCreateTag,
}: NoteTagsSectionProps) {
  const [newTagName, setNewTagName] = useState("")

  const availableOptions = useMemo(() => {
    const normalized = new Set<string>()
    for (const option of tagOptions) {
      const parsed = TagNameSchema.safeParse(option)
      if (!parsed.success) continue
      normalized.add(parsed.data)
    }
    return Array.from(normalized).sort((a, b) => a.localeCompare(b))
  }, [tagOptions])

  const submitNewTag = () => {
    if (!newTagName || isTagSaving || !isOwner) return
    void Promise.resolve(onCreateTag(newTagName)).then(() => {
      setNewTagName("")
    })
  }

  return (
    <>
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none min-h-6">
        {tags.map((tag) => (
          <Badge key={tag} variant="outline" className="inline-flex flex-none items-center gap-1 text-xs">
            #{tag}
            {isOwner ? (
              <button
                type="button"
                className="ml-1 inline-flex items-center justify-center rounded-full px-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => void onRemoveTag(tag)}
                disabled={isTagSaving}
                aria-label={`Remove tag ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </Badge>
        ))}
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setNewTagName("")
          }
          onDialogOpenChange(open)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add new tag"
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                disabled={isTagSaving || !isOwner}
                maxLength={TAG_NAME_MAX_LENGTH}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    submitNewTag()
                  }
                }}
              />
              <Button
                onClick={submitNewTag}
                disabled={isTagSaving || !newTagName.trim() || !isOwner}
              >
                Add
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">Tags on this note</p>
              <div className="flex flex-wrap gap-2 max-h-52 overflow-auto">
                {tags.length === 0 ? (
                  <span className="text-muted-foreground text-sm">No tags applied.</span>
                ) : (
                  tags.map((tag) => (
                    <Badge
                      key={`selected-${tag}`}
                      variant="outline"
                      className="text-xs inline-flex items-center gap-1"
                    >
                      #{tag}
                      {isOwner ? (
                        <button
                          type="button"
                          className="ml-1 inline-flex items-center justify-center rounded-full hover:bg-muted px-1 text-muted-foreground hover:text-foreground"
                          onClick={() => void onRemoveTag(tag)}
                          disabled={isTagSaving}
                          aria-label={`Remove tag ${tag}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      ) : null}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">Existing tags</p>
              <div className="flex flex-wrap gap-2 max-h-52 overflow-auto">
                {availableOptions.length === 0 ? (
                  <span className="text-muted-foreground text-sm">No tags yet.</span>
                ) : (
                  availableOptions.map((tag) => {
                    const alreadyLinked = tags.includes(tag)
                    return (
                      <Button
                        key={tag}
                        variant={alreadyLinked ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        disabled={alreadyLinked || isTagSaving || !isOwner}
                        onClick={() => void onAddTag(tag)}
                      >
                        #{tag}
                      </Button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
