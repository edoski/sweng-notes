type EmptyObject = Record<string, never>

declare global {
  interface Liveblocks {
    Storage: EmptyObject
    UserMeta: {
      id: string // Clerk userId from prepareSession
      info: {
        name: string
        color: string
        avatar: string
      }
    }
    RoomEvent: never
    ThreadMetadata: EmptyObject
    RoomInfo: EmptyObject
  }
}

export {};