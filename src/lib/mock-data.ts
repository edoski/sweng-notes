// Mock data for Sprint 2 - UI components without backend

export interface MockNote {
  id: string
  title: string
  content: string
  tags: string[]
  visibility: "private" | "public"
  owner: { id: string; username: string }
  updatedAt: number
  canEdit: boolean
}

export interface MockTag {
  name: string
  shared: boolean
}

export interface MockUser {
  id: string
  username: string
}

// Sample notes for demonstration
export const MOCK_NOTES: MockNote[] = [
  {
    id: "note-1",
    title: "Sprint Planning Notes",
    content: "# Sprint Planning\n\nDiscussed user stories and acceptance criteria for upcoming sprint.",
    tags: ["sprint-1", "planning"],
    visibility: "private",
    owner: { id: "user-1", username: "Alice" },
    updatedAt: Date.now() - 3600000, // 1 hour ago
    canEdit: true,
  },
  {
    id: "note-2",
    title: "Architecture Design",
    content: "## System Architecture\n\nProposed microservices architecture with API gateway pattern.",
    tags: ["architecture", "planning"],
    visibility: "public",
    owner: { id: "user-2", username: "Bob" },
    updatedAt: Date.now() - 7200000, // 2 hours ago
    canEdit: false,
  },
  {
    id: "note-3",
    title: "Meeting Notes - Jan 15",
    content: "Attendees: Alice, Bob, Charlie\n\nAgenda:\n1. Review progress\n2. Discuss blockers",
    tags: ["meetings", "sprint-1"],
    visibility: "public",
    owner: { id: "user-1", username: "Alice" },
    updatedAt: Date.now() - 86400000, // 1 day ago
    canEdit: true,
  },
  {
    id: "note-4",
    title: "API Documentation",
    content: "REST API endpoints and authentication flows documented here.",
    tags: ["documentation", "api"],
    visibility: "public",
    owner: { id: "user-3", username: "Charlie" },
    updatedAt: Date.now() - 172800000, // 2 days ago
    canEdit: false,
  },
]

// Sample tags
export const MOCK_TAGS: MockTag[] = [
  { name: "sprint-1", shared: true},
  { name: "sprint-2", shared: false },
  { name: "planning", shared: false },
  { name: "architecture", shared: false },
  { name: "meetings", shared: false },
  { name: "documentation", shared: false },
  { name: "frontend", shared: false },
  { name: "backend", shared: false },
]

// Current demo user
export const MOCK_CURRENT_USER: MockUser = {
  id: "user-1",
  username: "Alice",
}