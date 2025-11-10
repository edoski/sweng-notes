import { z } from "zod/v3"

export const MAX_NOTE_TITLE_LENGTH = 32 // Client-side text character limit (for TipTap CharacterCount)
export const MAX_TAG_NAME_LENGTH = 32
export const MAX_NOTE_CONTENT_LENGTH = 280 // Client-side string limit
export const MAX_NOTE_CONTENT_MARKDOWN_LENGTH = 10000 // Server-side markdown string limit (sane limit)

export const NoteVisibilitySchema = z.enum(["private", "public"])

export const NoteTitleSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().max(MAX_NOTE_TITLE_LENGTH, `Title must be ${MAX_NOTE_TITLE_LENGTH} characters or fewer.`))
  .transform((value) => (value === "" ? "Untitled" : value))

export const NoteContentSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .max(MAX_NOTE_CONTENT_MARKDOWN_LENGTH, `Content markdown exceeds maximum allowed length.`)
  )

export const TagNameSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, "Tag name cannot be empty")
      .max(MAX_TAG_NAME_LENGTH, `Tags must be ${MAX_TAG_NAME_LENGTH} characters or fewer.`),
  )

export function sanitizeNoteTitle(value: string): string {
  return NoteTitleSchema.parse(value)
}

export function sanitizeNoteContent(value: string): string {
  return NoteContentSchema.parse(value)
}

export function sanitizeTagName(value: string): string {
  return TagNameSchema.parse(value)
}

export function sanitizeTagList(values: string[] | undefined): string[] {
  if (!values || values.length === 0) {
    return []
  }
  const unique = new Set<string>()
  const sanitized: string[] = []
  for (const tag of values) {
    const parsed = sanitizeTagName(tag)
    if (!unique.has(parsed)) {
      unique.add(parsed)
      sanitized.push(parsed)
    }
  }
  return sanitized
}

const NoteCreateFields = {
  title: NoteTitleSchema,
  content: NoteContentSchema,
  tags: z
    .array(z.string())
    .optional()
    .transform((value) => sanitizeTagList(value)),
  visibility: NoteVisibilitySchema.optional().transform((value) => value ?? "private"),
} satisfies Record<string, z.ZodTypeAny>

const NoteUpdateFields = {
  title: NoteTitleSchema.optional(),
  content: NoteContentSchema.optional(),
  tags: z.array(TagNameSchema).optional(),
  visibility: NoteVisibilitySchema.optional(),
  saveVersion: z.boolean().optional(),
} satisfies Record<string, z.ZodTypeAny>

export const NoteCreateInputSchema = z.object(NoteCreateFields)
export const NoteUpdateArgsSchema = z.object(NoteUpdateFields)

export type NoteVisibility = z.infer<typeof NoteVisibilitySchema>