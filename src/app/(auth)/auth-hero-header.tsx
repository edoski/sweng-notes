import { Badge } from "@/components/ui/badge"

export default function AuthHeroHeader() {
  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="text-6xl font-bold tracking-tighter text-foreground">
        SWENG Notes
      </h1>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="px-4 py-1.5 text-sm">
          Edoardo Galli
        </Badge>
        <Badge variant="outline" className="px-4 py-1.5 text-sm">
          Jean Baptiste Dindane
        </Badge>
        <Badge variant="outline" className="px-4 py-1.5 text-sm">
          Luca Baldini
        </Badge>
      </div>
    </div>
  )
}