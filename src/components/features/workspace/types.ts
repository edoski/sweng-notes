export type DateFilterMode = "created" | "modified"

export interface DateFilter {
  key: string
  mode?: DateFilterMode
}
