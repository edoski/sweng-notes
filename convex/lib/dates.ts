import { format, isValid } from "date-fns"

export function getLocalDateKey(input: Date | number): string | null {
  const date = input instanceof Date ? input : new Date(input)
  if (!isValid(date)) {
    return null
  }
  return format(date, "yyyy-MM-dd")
}