# Product Backlog

## Epic Overview

| Epic | Use Case Category | Story Count |
|------|------------------|---|
| E1 | Base Use Cases | 2 |
| E2 | Account Management | 1 |
| E3 | Note Discovery | 2 |
| E4 | Tag Management | 1 |
| E5 | Note Operations | 2 |
| E6 | Version History | 3 |
| E7 | Collaboration & Sharing | 2 |

---

## Sprint Timeline

### Sprint 1: Foundation
**Focus:** Authentication & Project Setup

**Key Achievements:**
- Clerk authentication integration (login/register flows)
- Route protection middleware
- User session management
- Basic UI shell with UserButton

**Epics:**
- ✅ E1: Base Use Cases (complete)

**Key Decisions:**
- Chose Clerk over custom auth for reliable user session and auth security
- Middleware-based route protection pattern

---

### Sprint 2: Design & UI Framework
**Focus:** Complete UI/UX with mock data, database schema design

**Key Achievements:**
- Defined complete Convex schema (users, notes, tags, noteTags, notePermissions, noteVersions)
- Installed shadcn/ui component library (15+ components)
- Built workspace shell (sidebar, filters, command palette, tabs)
- URL-based filter state persistence
- SessionStorage-based tab management
- Mock data system for parallel frontend/backend development

**Epics:**
- ✅ E1: Base Use Cases (complete)
- ⚠️ E3-E7: In Progress (UI foundations, schema design)

**Key Decisions:**
- Frontend-first development (complete UI before backend)
- Normalized tag schema (tags table + noteTags junction table)
- Custom sidebar component system

---

### Sprint 3: Backend Integration
**Focus:** Convex backend CRUD, real-time data, TipTap editor

**Key Achievements:**
- Implemented core Convex CRUD operations (list, get, create, update, remove, duplicate)
- Clerk → Convex user sync with auto-ensure pattern (mutations auto-create users)
- TipTap editor integration with auto-save
- Replaced mock data with real Convex queries/mutations
- Toast notifications for user feedback
- Error boundary for graceful error handling

**Epics:**
- ✅ E1: Base Use Cases (complete)
- ⚠️ E3: Note Discovery (in progress)
- ⚠️ E4: Tag Management (in progress)
- ⚠️ E5: Note Operations (in progress)

**Key Decisions:**
- Vanilla Convex functions (no custom builders yet)
- Manual authentication checks (repetitive but explicit)
- Tags stored as arrays (will be normalized in Sprint 4)

---

### Sprint 4: Advanced Features & Production Polish
**Focus:** Real-time collaboration, permissions, versions, normalized tags, testing

**Key Achievements:**
- **Custom function builders** (factory pattern with options in closure)
- **Three-level permission system** (owner > editor > reader)
- **Liveblocks integration** (Y.js CRDT, real-time presence, cursors)
- **Normalized tag system** (O(1) rename, provenance tracking)
- **Version history** (manual save/restore, owner-only)
- **Sharing system** (grant/update/revoke access, visibility modes)
- **Delete account** (cascade deletion with Liveblocks cleanup)
- **Comprehensive test suite** (Vitest)

**Epics:**
- ✅ E1: Base Use Cases (complete)
- ✅ E2: Account Management (complete)
- ✅ E3: Note Discovery (complete)
- ✅ E4: Tag Management (complete)
- ✅ E5: Note Operations (complete)
- ✅ E6: Version History (complete)
- ✅ E7: Collaboration & Sharing (complete)

**Key Decisions:**
- Custom function builders eliminate boilerplate
- Factory pattern for options (noteQuery({requirePermission}))
- Normalized tag schema for O(1) operations
- Field-level permission granularity in single update mutation
- Liveblocks for Y.js CRDT conflict-free collaboration 
- Vitest for fast, modern testing

---

## Epic 1: Base Use Cases

### UC1.1: Registration

**As a** new user
**I want** to register for an account
**So that** I can securely access the note-taking platform

**Acceptance Criteria:**
- Clerk sign-up flow functional with username/password
- User record automatically created in Convex database on first login
- Profile includes: clerkId, username, avatar URL

---

### UC1.2: Authentication

**As a** user
**I want** to sign in with my credentials
**So that** I can access my notes and collaborate with others

**Acceptance Criteria:**
- Clerk authentication integrated with Next.js
- JWT tokens contain required claims (subject, preferredUsername)
- Session persists across page refreshes
- All other use cases extend from this (authentication required)

---

## Epic 2: Account Management

### UC2.1: Delete Account

**As a** user
**I want** to permanently delete my account and all associated data
**So that** I can exercise my right to data deletion

**Includes:**
- **Delete All Notes**: Cascade deletion of owned notes with versions, tags, collaborators
- **Delete All Tags**: Remove all user's tags from system

**Acceptance Criteria:**
- Deletes all owned notes (and their versions, permissions, tags)
- Removes user's collaborator permissions from shared notes
- Schedules Liveblocks room deletions for owned notes
- Confirmation dialog warns of permanent data loss
- No undo mechanism (permanent operation)

---

## Epic 3: Note Discovery

### UC3.1: Search Notes

**As a** user
**I want** to search my notes by title or content
**So that** I can quickly find relevant information

**Acceptance Criteria:**
- Full-text search across note titles
- Search results include owned + shared notes
- Results sorted by relevance (updatedAt)
- Search executes on input with debouncing

---

### UC3.2: Filter

**As a** user
**I want** to filter my notes by various criteria
**So that** I can narrow down results to what I need

**Extended by:**
- **Date Filter**
  - **Modification Date Filter**: Filter notes modified within date range
  - **Creation Date Filter**: Filter notes created within date range
- **Search Filter**: Text-based search (see UC3.1)
- **Owner Filter**: Filter notes by ownership (mine/shared)

**Acceptance Criteria:**
- Multiple filters can be combined (AND logic)
- Filter state persists in URL search params
- Real-time filter updates as criteria change
- Clear filters button resets all criteria

---

## Epic 4: Tag Management

### UC4.1: Manage Tags

**As a** user
**I want** to manage my tags across all notes
**So that** I can organize and categorize my content

**Extended by:**
- **Create Tag**: Add new tag when assigning to note
- **Rename Tag**: Rename across all notes (normalized schema)
- **Delete Tag**: Remove tag and cascade to all note associations

**Acceptance Criteria:**
- Tags are user-scoped (one tag per user per name)
- Tag rename updates single `tags` table entry (no loop through notes)
- Tag delete cascades to `noteTags` junction table
- Shared tags track provenance (`sharedFromNoteId`)

---

## Epic 5: Note Operations

### UC5.1: Create Note

**As a** user
**I want** to create a new note
**So that** I can start capturing information

**Acceptance Criteria:**
- New note initialized with empty title and content
- Private visibility by default
- Liveblocks room created for real-time collaboration
- Note appears in workspace list immediately

---

### UC5.2: Manage Note

**As a** user
**I want** to perform various operations on my notes
**So that** I can manage my content effectively

**Extended by:**

#### View Note
- **Permission**: All roles (Owner, Editor, Reader)
- **Acceptance Criteria**: Note content displayed in TipTap editor, real-time presence visible

#### Edit Note
- **Permission**: Owner, Editor
- **Acceptance Criteria**: TipTap editor with rich text formatting, Markdown support, character count (280 limit), auto-save to Convex

#### Duplicate Note
- **Permission**: All roles
- **Acceptance Criteria**: Creates new note with same content and tags, new owner is duplicating user, private visibility

#### Manage Note Tags (Owner only)
- **Add New Tag**: Create and assign tag to note
- **Add Existing Tag**: Assign existing tag to note
- **Remove Tag**: Unassign tag from note 
- **Acceptance Criteria**: Shared tags track provenance, real-time UI updates

#### Leave Note (Reader, Editor)
- **Permission**: Reader, Editor (not Owner)
- **Acceptance Criteria**: Removes user's permission entry, note disappears from user's list, owner retains note

#### Delete Note (Owner only)
- **Permission**: Owner only
- **Includes**: Remove All Collaborators
- **Acceptance Criteria**: Cascade deletion of versions, tags, permissions, schedules Liveblocks room deletion, confirmation dialog

---

## Epic 6: Version History (Owner Only)

### UC6.1: View Note Versions

**As a** note owner
**I want** to view all saved versions of my note
**So that** I can review historical snapshots

**Acceptance Criteria:**
- List of versions with title, content preview, timestamp
- Version count displayed in UI

---

### UC6.2: Save Note Version

**As a** note owner
**I want** to manually save a version snapshot
**So that** I can preserve important milestones

**Acceptance Criteria:**
- Captures current title, content, tags at save time
- Version includes metadata: saved by, timestamp
- No automatic versioning (manual control)
- Confirmation toast on successful save

---

### UC6.3: Restore Note Version

**As a** note owner
**I want** to restore a previous version
**So that** I can revert unwanted changes

**Acceptance Criteria:**
- Restores title, content, tags from selected version
- Real-time updates for active collaborators

---

## Epic 7: Collaboration & Sharing (Owner Only)

### UC7.1: Manage Collaborators

**As a** note owner
**I want** to control who can access my note and their permission level
**So that** I can collaborate securely

**Extended by:**

#### Add Collaborator
- **Includes**: Set Public Visibility (automatic)
- **Acceptance Criteria**: Adds user to note with specified role (Editor/Reader), automatically sets note to public visibility, user receives notification, user sees note in their list

#### Change Collaborator Permissions
- **Acceptance Criteria**: Updates user's role (Editor ↔ Reader), cannot change owner, real-time permission enforcement, user receives notification

#### Remove Collaborator
- **Acceptance Criteria**: Deletes permission entry, note disappears from collaborator's list, collaborator loses room access immediately

---

### UC7.2: Manage Note Visibility

**As a** note owner
**I want** to control the visibility mode of my note
**So that** I can decide who can potentially access it

**Extended by:**

#### Set Public Visibility
- **Acceptance Criteria**: Allows collaborators to be added, note remains invisible to non-collaborators, owner maintains full control

#### Set Private Visibility
- **Includes**: Remove All Collaborators (automatic)
- **Acceptance Criteria**: Removes all collaborators automatically, only owner can access, Liveblocks room restricted to owner