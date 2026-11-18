import { ancestry } from '../model/architecture'

// Contexts are containers whose children are visible; undefined is the overview.
export function contextRoute(from?: string, to?: string) {
  const a = [undefined, ...ancestry(from).map((c) => c.id)]
  const b = [undefined, ...ancestry(to).map((c) => c.id)]
  let shared = 0
  while (
    shared + 1 < Math.min(a.length, b.length) &&
    a[shared + 1] === b[shared + 1]
  )
    shared++
  return {
    common: a[shared],
    contexts: [...a.slice(shared).reverse(), ...b.slice(shared + 1)],
  }
}
