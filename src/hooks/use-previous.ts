import { useEffect, useRef } from "react"

/**
 * Hook that returns the previous value of a variable.
 * Returns undefined on first render.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}
