# Developer Manual

This document provides essential information for installing, running, and contributing to the sweng-notes collaborative note-taking application. It documents the core architecture, design patterns, and development workflows needed to understand and extend the system.

---

## Table of Contents

1. [Overview](#overview)
2. [Installation & Setup](#installation--setup)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Frontend Architecture](#frontend-architecture)
7. [Real-Time Collaboration](#real-time-collaboration)
8. [Design Patterns](#design-patterns)

---

## Overview

**sweng-notes** is a collaborative note-taking application with real-time editing capabilities. It enables multiple users to:

- Create and organize notes with tags
- Edit notes collaboratively with live cursor tracking
- Share notes with granular permissions (owner/editor/reader)
- Search notes with full-text search, and filters
- Track version history and restore previous versions
- Mention collaborators in note content

### Key Features

- **Real-time Collaboration**: Live cursor positions, presence awareness, concurrent editing via Yjs
- **Granular Permissions**: Three-level hierarchy (owner/editor/reader) with per-note access control
- **Full-text Search**: Search across note titles, content, and filters with combined results
- **Version History**: Manual version snapshots with restore capability (owner-only)
- **Tag Management**: User-owned tags with automatic sync to collaborators
- **Markdown Support**: TipTap editor with markdown input/output

### Architecture Philosophy

The application follows a **three-layer serverless architecture**:

1. **Frontend** (Next.js 15 + React 19): Handles UI, state management, and client-side routing
2. **Backend** (Convex): Serverless functions with custom authentication/authorization builders
3. **Real-time** (Liveblocks): WebSocket-based collaboration with operational transformation

This separation provides:
- **Zero cold starts**: Convex serverless functions are always warm
- **Automatic scaling**: Both Convex and Liveblocks scale transparently
- **Type safety**: End-to-end TypeScript with auto-generated types
- **Security**: Server-side permission checks, no client-side trust

---

## Installation & Setup

### Prerequisites

- **Node.js**: v20 or later
- **pnpm**: Package manager (install via `npm install -g pnpm`)

### Installation Steps

This project is configured for **zero-setup local development**. No cloud accounts, API keys, or configuration needed, just clone and run.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/edoski/sweng-notes.git
   cd sweng-notes
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Run the development server**:
   ```bash
   pnpm dev
   ```
**On first run**, you'll see:
```
⏳ Waiting for Convex initialization...
? Configure Convex development
  › Create a local deployment (no account)
    Create account or log in
```

Select **"Create a local deployment"** and press Enter a few times (auto-approve setup steps).

After initialization completes:
```
✓ Convex initialized! Syncing environment variables...
  → LIVEBLOCKS_SECRET_KEY synced
  → CLERK_SECRET_KEY synced
✓ Environment variables synced to Convex backend
```

This starts both the Next.js frontend (port 3000) and Convex backend in parallel.

4. **Access the application**:

    Open http://localhost:3000 in your browser. If you encounter any errors during the setup, we have provisioned a deployed instance of the project at https://sweng-notes.vercel.app to use.

We have provisioned a demonstrative account ready to use for testing purposes:
```
Username: demo
Password: password
```

---

## Technology Stack

### Frontend

| Technology       | Version | Purpose                                 |
|------------------|---------|-----------------------------------------|
| **Next.js**      | 15 | React framework with App Router         |
| **React**        | 19 | UI library with concurrent features     |
| **TypeScript**   | 5.x | Type safety and developer experience    |
| **Tailwind CSS** | 4 | Utility-first styling                   |
| **TipTap**       | 3.x | Rich text editor with Markdown support  |
| **Liveblocks**   | 3.10+ | Real-time collaboration (presence, Yjs) |
| **Shadcn UI**    | Latest | UI component primitives                 |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Convex** | Latest | Serverless backend (functions + database) |
| **convex-helpers** | Latest | Custom function builder utilities |
| **Clerk** | Latest | Authentication and user management |
| **Zod** | 4.x | Input validation for Convex functions |

### Infrastructure

| Service | Purpose |
|---------|---------|
| **Convex Cloud** | Serverless backend hosting, database, real-time queries |
| **Liveblocks** | Real-time collaboration infrastructure (WebSocket, Yjs, presence) |
| **Clerk** | Authentication service (JWT-based) |
| **Vercel** | Frontend hosting (Next.js deployment) |

---

## System Architecture

### Three-Layer Model

```
┌────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 15)                      │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Workspace   │  │ Note Editor  │  │   Dialogs    │          │
│  │              │  │  (TipTap +   │  │  (Share,     │          │
│  │  - Search    │  │  Liveblocks) │  │   Details)   │          │
│  │  - Filters   │  │              │  │              │          │
│  │  - Note List │  │  - Autosave  │  │  - Forms     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                │
│  State: URL/Storage (UI) + React Context (scoped) + Convex     │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         │ Convex React Hooks (queries/mutations)
                         │ Liveblocks Client (WebSocket)
                         │
┌────────────────────────┴───────────────────────────────────────┐
│                   BACKEND (Convex Serverless)                  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            Custom Function Builders                     │   │
│  │                                                         │   │
│  │  noteQuery(opts)  →  Automatic authentication +         │   │
│  │  noteMutation(opts)  permission checking + noteId       │   │
│  │                      injection                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    notes/    │  │   sharing    │  │     tags     │          │
│  │              │  │              │  │              │          │
│  │  - list()    │  │ - grant()    │  │  - list()    │          │
│  │  - create()  │  │ - revoke()   │  │  - create()  │          │
│  │  - update()  │  │              │  │  - rename()  │          │
│  │  - remove()  │  │              │  │  - remove()  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                │
│  Database: Convex Document Store with Indexes                  │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         │ Liveblocks Node SDK (room authorization)
                         │
┌────────────────────────┴───────────────────────────────────────┐
│                    REAL-TIME (Liveblocks)                      │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Presence   │  │   Y.js CRDT  │  │   Threads    │          │
│  │              │  │              │  │              │          │
│  │  - Cursors   │  │  - OT for    │  │  - Comments  │          │
│  │  - Active    │  │    concurrent│  │  - Mentions  │          │
│  │    users     │  │    editing   │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                │
│  Rooms: noteId (one room per note)                             │
└────────────────────────────────────────────────────────────────┘
```

### State Management Layers

The application uses three distinct layers for state management:

#### 1. Server State (Convex)
**Purpose**: Source of truth for all persistent data

- Real-time reactive queries (automatic re-fetch on changes)
- Optimistic updates for instant UI feedback
- Automatic caching and deduplication
- Type-safe with generated types

**Example**:
```typescript
// Query (reactive, auto-updates)
const notes = useQuery(api.notes.list, { search, tags })

// Mutation (with optimistic update)
const createNote = useMutation(api.notes.create)
await createNote({ title: "New Note", content: "", tags: [], visibility: "private" })
```

#### 2. URL Search Parameters
**Purpose**: Shareable, bookmarkable UI state

- Deep linking: Direct links to filtered views, specific notes, dialogs
- Browser navigation: Back/forward buttons work naturally
- Shareable: Users can copy URLs to share exact application state

**Example**: `/?search=react&tags=frontend,tutorial&note=xyz123`

#### 3. Browser Storage (sessionStorage)
**Purpose**: Personal preferences and session state

- Survives refresh, cleared on browser close
- Not shareable (user-specific)
- Used for open tabs tracking

---

## Backend Architecture

### Database Schema

The Convex database uses a document model with indexes for efficient queries.

#### Tables

**`users`** - User accounts synced from Clerk
```typescript
{
  _id: Id<"users">
  clerkId: string           // Clerk user ID (unique, indexed)
  username: string          // Display name
  updatedAt: number         // Last update timestamp
}
```

**`notes`** - Note documents
```typescript
{
  _id: Id<"notes">
  ownerId: Id<"users">      // Note owner (indexed)
  title: string             // Note title (max 32 chars, search indexed)
  content: string           // Markdown content (max 280 chars, search indexed)
  visibility: "private" | "public"
  updatedAt: number         // Last modification (indexed)
  version: number           // Version number (incremented on manual save)
  activeVersionId: v.optional(v.id("noteVersions"))  // Active version of note
}
```

**`notePermissions`** - Access control for shared notes
```typescript
{
  _id: Id<"notePermissions">
  noteId: Id<"notes">       // Note being shared (indexed)
  userId: Id<"users">       // User with access (indexed)
  role: "reader" | "editor" // Permission level
}
```

**`tags`** - User-owned tags with provenance tracking
```typescript
{
  _id: Id<"tags">
  ownerId: Id<"users">      // Tag owner (indexed)
  name: string              // Tag name (indexed with owner)
  sharedFromNoteId: Id<"notes"> | undefined  // Optional: which note introduced this shared tag
}
```

**`noteTags`** - Normalized note-tag relationships using foreign keys
```typescript
{
  _id: Id<"noteTags">
  noteId: Id<"notes">       // Note (indexed with tagId)
  tagId: Id<"tags">         // Foreign key to tags table (indexed with noteId)
}
```

**`noteVersions`** - Version history snapshots
```typescript
{
  _id: Id<"noteVersions">
  noteId: Id<"notes">       // Note (indexed)
  ownerId: Id<"users">      // User who saved this version
  title: string             // Title at this version
  snapshot: string          // Content at this version
  _creationTime: number     // Auto-generated timestamp
}
```

#### Key Indexes

**Performance-Critical Indexes**:

```typescript
// Fast note listing by owner
notes.by_ownerId_updatedAt: (ownerId, updatedAt)

// Full-text search
notes.search_title: searchField("title")
notes.search_content: searchField("content")

// Permission lookups
notePermissions.by_note: (noteId)
notePermissions.by_user: (userId)
notePermissions.by_note_user: (noteId, userId)

// Tag operations (normalized schema)
tags.by_owner_name: (ownerId, name)
tags.by_name: (name)
noteTags.by_note_tag_id: (noteId, tagId)
noteTags.by_tag_note_id: (tagId, noteId)

// Version history
noteVersions.by_note: (noteId)

// User lookups
users.by_clerkId: (clerkId)
users.by_username: (username)
```

### Custom Function Builders

**File**: `convex/lib/zod.ts`

This is the **most critical architectural pattern** in the backend. The custom function builders provide a factory pattern for defining Convex functions with built-in authentication and authorization.

#### Factory Pattern with Closures

The builders use a **two-stage factory pattern**:

1. **Factory stage**: Accepts options (e.g., permission requirements)
2. **Builder stage**: Returns a function builder with options baked in

```typescript
// ❌ WRONG - This doesn't work
noteQuery({
  requirePermission: "editor",
  args: { ... },
  handler: ...
})

// ✅ CORRECT - Factory pattern with closure
noteQuery({ requirePermission: "editor" })({
  args: { ... },
  handler: ...
})
```

**Why this pattern?** Options need to be available during the middleware phase (before the handler runs) to perform authentication and authorization checks. By capturing options in a closure, we can run these checks and inject context before the handler executes.

#### Builder Hierarchy

**Base Builders** (no authentication):
- `zQuery`, `zMutation` - Standard Convex functions
- `zInternalQuery`, `zInternalMutation`, `zInternalAction` - Internal-only functions

**Authenticated Builders** (require login, add `ctx.viewer`):
- `authedQuery`, `authedMutation` - User must be authenticated

**Note-Scoped Builders** (require note access, add `ctx.viewer` + `ctx.noteAccess`, auto-inject `noteId`):
- `noteQuery(options)` - Query with note permission check
- `noteMutation(options)` - Mutation with note permission check

#### Context Enhancement

Each builder layer adds context to `ctx`:

```typescript
// Base builder: ctx from Convex (db, auth, scheduler)
// + authedQuery: ctx.viewer = { user: Doc<"users">, identity: UserIdentity }
// + noteQuery:   ctx.noteAccess = { status: "ok", note: Doc<"notes">, permission: "owner"|"editor"|"reader" }
//                args.noteId automatically injected
```

**Example**:
```typescript
export const get = noteQuery({ optional: true })({
  args: z.object({}),
  handler: async (ctx) => {
    // ctx.viewer.user - Current user document
    // ctx.noteAccess.status - Access status ("ok" | "not_found" | "unauthorized")
    // ctx.noteAccess.note - Note document (if status is "ok")
    // ctx.noteAccess.permission - User's permission level ("owner" | "editor" | "reader")
    // args.noteId - Automatically injected (type: Id<"notes">)

    if (ctx.noteAccess.status !== "ok") {
      return null  // Gracefully handle access failure
    }

    return ctx.noteAccess.note
  }
})
```

#### Builder Options

Note-scoped builders accept these options:

```typescript
{
  optional?: boolean               // Don't throw on access failure
  requirePermission?: Permission   // "owner" | "editor" | "reader" (or array)
  notFoundMessage?: string         // Custom error message
  unauthorizedMessage?: string     // Custom error message
}
```

**Usage example**:
```typescript
// Automatic permission validation
export const update = noteMutation({
  requirePermission: ["owner", "editor"],  // ✅ Multiple permissions supported
  unauthorizedMessage: "Insufficient permissions to edit",
})({
  args: { title: z.string(), content: z.string() },
  handler: async (ctx, args) => {
    // Permission already validated - status is guaranteed "ok"
    const { note } = ctx.noteAccess
    await ctx.db.patch(args.noteId, { title: args.title, content: args.content })
    return note
  }
})
```

### Permission System

**File**: `convex/lib/note_access.ts`

#### Permission Hierarchy

```
owner     - Full control (delete, share, visibility, save versions, manage tags, edit, read)
  ↓
editor    - Edit content only (cannot manage tags, delete, share, or change visibility)
  ↓
reader    - Read-only access
```

#### Permission Resolution Algorithm

```typescript
async function resolvePermission(
  ctx: AnyCtx,
  note: Doc<"notes">,
  userId: Id<"users">
): Promise<"owner" | "editor" | "reader" | null>
```

**Steps**:

1. **Owner check**: `note.ownerId === userId` → return `"owner"`
2. **Visibility check**: `note.visibility === "private"` → return `null` (unauthorized)
3. **Shared access lookup**: Query `notePermissions` table for `(noteId, userId)` → return role or `null`

**Access Status Types**:

```typescript
type NoteAccessStatus =
  | { status: "ok"; note: Doc<"notes">; permission: "owner"|"editor"|"reader" }
  | { status: "not_found" }
  | { status: "unauthorized" }
```

#### Visibility Modes

**`private`** (default):
- Only owner can access
- No entries in `notePermissions` table
- Downgrading to private deletes all permissions

**`public`** (shareable):
- Owner can grant permissions to other users
- Entries created in `notePermissions` table
- Collaborators get synced tags (with `sharedFromNoteId` set to the note)

---

## Frontend Architecture

### Key Frontend Patterns

#### Context Splitting Pattern

**Problem**: Large components with many concerns cause unnecessary re-renders.

**Solution**: Split contexts by concern so components only re-render when their specific context changes.

**Example**: The note editor splits state into 4 focused contexts:

```typescript
// 1. Core editor state (note, editor instance, permissions)
const { note, editor, canEdit } = useEditorCoreContext()

// 2. Collaboration features (tags, sharing, visibility)
const { tags, visibility, shareData } = useEditorCollaborationContext()

// 3. Version history (restore, list)
const { versionItems, handleRestore } = useEditorVersionContext()

// 4. Actions (save, delete, duplicate)
const { handleSave, handleDelete } = useEditorActionsContext()
```

**Benefits**:
- Components subscribe to minimal context
- Reduced unnecessary re-renders (performance)
- Clear separation of concerns
- Easier testing (mock individual contexts)

---

## Real-Time Collaboration

### Liveblocks Integration

**Architecture**: Client → API Route → Convex → Liveblocks

**Authentication Flow**:

```
1. Frontend requests room access:
   const room = useRoom()  // Triggers authentication

2. Liveblocks calls authEndpoint:
   POST ${convexHttpUrl}/liveblocks-auth (Convex HTTP action)
   Body: { room: "note-abc123" }

3. Convex HTTP action validates session:
   - Get Clerk userId from session
   - Create authenticated Convex client
   - Query notes.get(noteId) with Clerk token
   - Verify user has access to note

4. API route returns JWT:
   - If owner/editor: return token with FULL_ACCESS
   - If reader: return token with READ_ACCESS
   - If no access: return 403

5. Liveblocks connects with JWT:
   - Client establishes WebSocket connection
   - useStatus() returns "connected"
   - Editor initializes with proper permissions
```

**Key Files**:
- `convex/http.ts` - Convex HTTP actions for `/liveblocks-auth` (room authorization) and `/setup-avatar` (Clerk avatar setup)
- `src/components/shared/providers.tsx` - LiveblocksProvider setup with inline resolvers

**Note**: User resolution (`resolveUsers`) and mention suggestions (`resolveMentionSuggestions`) are handled via inline resolvers in `providers.tsx` that call Convex directly (no HTTP endpoints needed).

### TipTap + Liveblocks Integration

**File**: `src/components/features/notes/editor/note-editor.tsx`

**Key configuration**:

```typescript
const editor = useEditor({
  immediatelyRender: false,
  extensions: [
    StarterKit.configure({ undoRedo: false }),  // Undo/redo disabled (conflicts with Liveblocks Y.js)
    liveblocksExtension,  // Liveblocks collaborative editing
    CharacterCount.configure({
      limit: MAX_NOTE_CONTENT_LENGTH,
      mode: "textSize",
    }),
    Markdown.configure({
      markedOptions: {
        gfm: true,     // GitHub Flavored Markdown (includes linkify)
        breaks: true,  // Convert \n to <br>
      },
    }),
  ],
  autofocus: false,
  editable: canEdit,
}, [note.id])
```

**Key Points**:
1. **`initialContent`**: Initial note content passed to Liveblocks extension (not `useEditor`)
2. **`immediatelyRender: false`**: Performance optimization for SSR/hydration
3. **History disabled**: TipTap's built-in history conflicts with Liveblocks' Y.js history
4. **`mode: "textSize"`**: Character counting mode using text content size
5. **Stable instance**: Editor created once per note via dependency array `[note.id]`

---

## Design Patterns

This section documents the key design patterns used in the codebase and the advantages they provide.

### 1. Factory Pattern with Closures (Custom Function Builders)

**What it is**: A two-stage factory pattern for defining Convex functions with built-in authentication and authorization. Options are captured in a closure and available during the middleware phase before the handler runs.

**Where to find it**: `convex/lib/zod.ts` (283 lines)

**Example**:
```typescript
// Factory stage captures options
export const noteQuery = (options?: NoteBuilderOptions) =>
  // Builder stage returns function builder with options baked in
  ({ args, handler }) => {
    // Options available during middleware phase
    // Permission check runs before handler
    return customQueryBuilder({ args, handler, options })
  }

// Usage
export const get = noteQuery({ requirePermission: "editor" })({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    // Permission already validated
    // ctx.noteAccess.note guaranteed to exist
    return ctx.noteAccess.note
  }
})
```

**Advantages**:
1. **DRY Principle**: Permission checking code written once, reused in ALL backend functions
2. **Type Safety**: Context enhancement adds `ctx.viewer` and `ctx.noteAccess` with TypeScript guarantees
3. **Security**: Impossible to forget permission checks (they run automatically before handler)
4. **Auto-injection**: `noteId` parameter automatically added to args
5. **Maintainability**: Change permission logic in one place, affects all functions

**Evidence**: Used in 52 exported functions across 14 backend files

### 2. Normalized Schema with Foreign Keys (Tag Architecture)

**What it is**: Tag definitions stored in `tags` table (one per user per name), with `noteTags` junction table using `tagId` foreign keys instead of tag strings.

**Where to find it**: `convex/lib/note_tags.ts`, `convex/schema.ts`

**Schema**:
```typescript
// Tags table (normalized)
tags: { _id, ownerId, name, sharedFromNoteId? }

// Junction table (foreign key)
noteTags: { _id, noteId, tagId }
```

**Example**:
```typescript
// OLD (O(N)): Loop through all notes, update tag strings
for (const note of notes) {
  await ctx.db.patch(note._id, { tags: note.tags.map(t => t === "old" ? "new" : t) })
}

// NEW (O(1)): Single update to tags table
await ctx.db.patch(tagId, { name: "new" })
// All notes automatically see new name (noteTags still reference same tagId)
```

**Advantages**:
1. **O(1) Tag Rename**: Changed from O(N) loop through all notes to single `db.patch(tagId, {name})`
2. **Automatic Cascade**: Deleting tag automatically updates all note associations via index queries
3. **Single Source of Truth**: Tag name stored once, not duplicated across notes
4. **Clear Provenance**: `sharedFromNoteId` tracks which note introduced shared tags

**Before/After comparison**:
- **Old**: Rename tag → loop through 100 notes → 100 updates
- **New**: Rename tag → 1 update to tags table → done

### 3. Context Splitting (Performance Optimization)

**What it is**: Note editor splits state into 4 focused contexts (Core, Collaboration, Version, Actions) so components only re-render when their specific context changes.

**Where to find it**: `src/components/features/notes/editor/contexts/*.tsx` (4 separate contexts)

**Example**:
```typescript
// 4 focused contexts in note editor
export interface EditorCoreContextValue {
  note: Note
  title: string
  editor: Editor | null
  canEdit: boolean
  isOwner: boolean
}

export interface EditorCollaborationContextValue {
  tags: string[]
  visibility: NoteVisibility
  shareData: ShareData | undefined
  handleAddCollaborator: (username: string, role: Role) => Promise<boolean>
}

// Components subscribe only to what they need
function NoteTitleEditor() {
  const { title, setTitle, canEdit } = useEditorCoreContext()
  // Only re-renders when core context changes (not when tags change)
}

function NoteTagsManager() {
  const { tags, handleAddTagToNote } = useEditorCollaborationContext()
  // Only re-renders when collaboration context changes (not when title changes)
}
```

**Advantages**:
1. **Reduced Re-renders**: Tag manager only re-renders when collaboration context changes (not when title changes)
2. **Clear Separation**: Each context has single responsibility
3. **Performance**: Measured improvement in editor responsiveness with 10+ open tabs
4. **Testability**: Mock individual contexts in isolation

**Evidence**: Title input component doesn't re-render when tags change (verified via React DevTools profiler)

### 4. URL-Native State Management

**What it is**: Removed Zustand global store. UI state lives in URL parameters (search, tags, activeNote, dialogs), session state in sessionStorage (open tabs).

**Where to find it**: `src/hooks/use-workspace-url-state.ts`, `src/hooks/use-persisted-tabs.ts`

**Example**:
```typescript
// Before (Zustand): Separate client-side state store
const searchQuery = useSearchStore(state => state.searchQuery)
const setSearchQuery = useSearchStore(state => state.setSearchQuery)

// After (URL-native): URL is source of truth
const searchParams = useSearchParams()
const router = useRouter()
const searchQuery = searchParams.get("search") || ""
const setSearchQuery = (query: string) => {
  router.push(`/?search=${query}`)
}

// Result: /?search=react&tags=frontend,tutorial&note=xyz123
```

**Advantages**:
1. **Deep Linking**: Share exact filter state via URL
2. **Browser Integration**: Back/forward buttons work naturally
3. **No Sync Bugs**: URL is single source of truth (eliminated race conditions)
4. **Debuggability**: Inspect state via address bar