import type { Place } from './layout'

// Use the clear gutters between rows/columns for connections that skip cards.
// Coordinates are sibling-local units so routing and signal speed scale together.
export function route(
  source: Place,
  target: Place,
  vertical: boolean,
  lane: number,
  channel?: number,
) {
  const scale = source.scale
  const dx = (target.box.x - source.box.x) / scale
  const dy = (target.box.y - source.box.y) / scale
  const w = source.box.width / scale,
    h = source.box.height / scale
  const slot = channel ?? Math.max(-10, Math.min(10, lane * 4))
  const offset = slot * 2
  // Neighbors in the same column need no side detour.
  if (!vertical && Math.abs(dx) < 0.001 && dy <= h + 72.001) {
    return [
      [w / 2 + offset, h],
      [w / 2 + offset, dy],
    ]
  }
  if (vertical) {
    if (dy < h * 2)
      return channel === undefined
        ? undefined
        : [
            [w / 2 + offset, h],
            [w / 2 + offset, dy],
          ]
    return [
      [w / 2 + offset, h],
      [w / 2 + offset, h + 18 + slot],
      [w + 24 + slot, h + 18 + slot],
      [w + 24 + slot, dy - 18 + slot],
      [w / 2 + offset, dy - 18 + slot],
      [w / 2 + offset, dy],
    ]
  }
  if (Math.abs(dy) < 0.001 && dx < w * 2)
    return channel === undefined
      ? undefined
      : [
          [w, h / 2 + offset],
          [dx, h / 2 + offset],
        ]
  const gutter = dy ? dy - 36 + slot : -24 + slot
  return [
    [w, h / 2 + offset],
    [w + 32 + slot, h / 2 + offset],
    [w + 32 + slot, gutter],
    [dx - 32 + slot, gutter],
    [dx - 32 + slot, dy + h / 2 + offset],
    [dx, dy + h / 2 + offset],
  ]
}
