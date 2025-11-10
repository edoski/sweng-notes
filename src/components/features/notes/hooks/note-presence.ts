import { useMemo } from "react"
import { useOthers, useSelf } from "@liveblocks/react/suspense"

interface UseNotePresenceOptions {
  currentUser: { id: string; username: string }
}

export function useNotePresence({ currentUser }: UseNotePresenceOptions) {
  const others = useOthers()
  const self = useSelf()

  const presenceChips = useMemo(() => {
    const chips: Array<{ userId: string; label: string; avatar?: string }> = []
    const seen = new Set<string>()

    const addChip = (userId: string, label: string, avatar?: string) => {
      if (seen.has(userId)) return
      seen.add(userId)
      chips.push({ userId, label, avatar })
    }

    // Add self
    const selfId = self?.id ?? currentUser.id
    addChip(selfId, "You", self?.info?.avatar)

    // Add others
    others.forEach((participant) => {
      const participantId = participant.id ?? `conn-${participant.connectionId}`
      if (!participantId || participantId === selfId) {
        return
      }
      const username = participant.info?.name?.trim()
      const label = participantId === currentUser.id ? "You" : username ?? "Guest"
      addChip(participantId, label, participant.info?.avatar)
    })

    return chips
  }, [currentUser.id, others, self])

  return {
    presenceChips,
  }
}