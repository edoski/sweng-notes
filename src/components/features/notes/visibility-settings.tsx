import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { Globe, Lock } from "lucide-react"
import type { NoteVisibility } from "@/convex/lib/note_helpers"

interface VisibilitySettingsProps {
  visibility: NoteVisibility
  canManage: boolean
  pending: boolean
  onChangeVisibility: (visibility: NoteVisibility) => Promise<void>
}

export function VisibilitySettings({
  visibility,
  canManage,
  pending,
  onChangeVisibility,
}: VisibilitySettingsProps) {
  const isPublic = visibility === "public"

  const handleVisibilityChange = async (nextVisibility: NoteVisibility) => {
    if (nextVisibility === visibility) return
    await onChangeVisibility(nextVisibility)
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Visibility</Label>
      <div
        className={cn(
          "flex items-center justify-between rounded-md border px-3 py-2",
          (!canManage || pending) && "opacity-60"
        )}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          <span>{isPublic ? "Public" : "Private"}</span>
        </div>
        <Switch
          checked={isPublic}
          onCheckedChange={(checked) =>
            void handleVisibilityChange(checked ? "public" : "private")
          }
          disabled={!canManage || pending}
          aria-label="Toggle note visibility"
        />
      </div>
    </div>
  )
}