import type { Place } from './layout'

// Use the clear gutters between rows/columns for connections that skip cards.
// Coordinates are sibling-local units so routing and signal speed scale together.
export function route(
  source: Place,
  target: Place,
  vertical: boolean,
  lane: number,
) {
  const scale = source.scale
  const dx = (target.box.x - source.box.x) / scale
  const dy = (target.box.y - source.box.y) / scale
  const w = source.box.width / scale,
    h = source.box.height / scale
  const offset = lane * 10
  if (vertical) {
    if (dy < h * 2) return undefined
    return [
      [w / 2 + offset, h],
      [w / 2 + offset, h + 12],
      [w + 24 + offset, h + 12],
      [w + 24 + offset, dy - 12],
      [w / 2 + offset, dy - 12],
      [w / 2 + offset, dy],
    ]
  }
  if (Math.abs(dy) < 0.001 && dx < w * 2) return undefined
  const gutter = dy ? dy - 36 + offset : -24 + offset
  return [
    [w, h / 2 + offset],
    [w + 20 + offset, h / 2 + offset],
    [w + 20 + offset, gutter],
    [dx - 20 + offset, gutter],
    [dx - 20 + offset, dy + h / 2 + offset],
    [dx, dy + h / 2 + offset],
  ]
}
