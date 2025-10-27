/**
 * Formats a numeric timestamp into a short DD/MM/YY, HH:MM string.
 * Returns an empty string when the timestamp is invalid.
 */
export function formatTimestamp(value: number) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = String(date.getFullYear()).slice(-2)
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${day}/${month}/${year}, ${hours}:${minutes}`
}