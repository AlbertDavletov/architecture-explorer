import type { Rect } from '@xyflow/react'

// Exact open-interior clipping. Boundary contact is allowed.
export function intersectsInterior(a: number[], b: number[], rect: Rect) {
  let low = 0,
    high = 1
  for (const [axis, min, max] of [
    [0, rect.x, rect.x + rect.width],
    [1, rect.y, rect.y + rect.height],
  ]) {
    const delta = b[axis] - a[axis]
    if (Math.abs(delta) < 1e-10) {
      if (a[axis] <= min + 1e-8 || a[axis] >= max - 1e-8) return false
    } else {
      const t1 = (min - a[axis]) / delta,
        t2 = (max - a[axis]) / delta
      low = Math.max(low, Math.min(t1, t2))
      high = Math.min(high, Math.max(t1, t2))
    }
  }
  return high - low > 1e-8
}

export function sharedLength(
  a: number[],
  b: number[],
  c: number[],
  d: number[],
) {
  for (const axis of [0, 1]) {
    const other = 1 - axis
    if (
      Math.abs(a[other] - b[other]) < 1e-8 &&
      Math.abs(c[other] - d[other]) < 1e-8 &&
      Math.abs(a[other] - c[other]) < 1e-8
    )
      return Math.max(
        0,
        Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis])) -
          Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis])),
      )
  }
  return 0
}
