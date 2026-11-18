import type { Rect, Viewport, XYPosition } from '@xyflow/react'
import { children } from '../model/architecture'

export const CARD = { width: 224, height: 96 }
export interface Size {
  width: number
  height: number
}
export interface Place {
  box: Rect
  inside: Rect
  scale: number
  childScale: number
}

export function center(box: Rect): XYPosition {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}
function centered(point: XYPosition, width: number, height: number): Rect {
  return { x: point.x - width / 2, y: point.y - height / 2, width, height }
}

// Each group has its own drawing units. Resolve them into one world once,
// including the room around the children that becomes their parent's outline.
export function buildWorld(vertical: boolean, getChildren = children) {
  const places = new Map<string, Place>()
  function group(
    parent: string | undefined,
    anchor: XYPosition,
    scale: number,
  ): Rect {
    const items = getChildren(parent)
    const columns = vertical ? 1 : Math.max(1, Math.min(3, items.length))
    const rows = Math.ceil(items.length / columns)
    const gapX = items.length > 3 ? 64 : 172,
      gapY = vertical ? 36 : 72
    const width = columns * CARD.width + (columns - 1) * gapX
    const height = rows * CARD.height + (rows - 1) * gapY
    const bounds = centered(
      anchor,
      (width + 88) * scale,
      (height + 120) * scale,
    )
    items.forEach((item, i) => {
      const x = bounds.x + (44 + (i % columns) * (CARD.width + gapX)) * scale
      const y =
        bounds.y + (68 + Math.floor(i / columns) * (CARD.height + gapY)) * scale
      const box = {
        x,
        y,
        width: CARD.width * scale,
        height: CARD.height * scale,
      }
      const childScale = scale * 0.42
      const inside = getChildren(item.id).length
        ? group(item.id, center(box), childScale)
        : box
      places.set(item.id, { box, inside, scale, childScale })
    })
    return bounds
  }
  const overview = group(undefined, { x: 0, y: 0 }, 1)
  return { places, vertical, overview }
}
export type World = ReturnType<typeof buildWorld>
export function framing(world: World, size: Size, parent?: string) {
  const place = parent ? world.places.get(parent) : undefined
  const box = place?.inside ?? world.overview
  const unit = place?.childScale ?? 1
  const width = size.width - Math.min(36, size.width * 0.12)
  const height = size.height - Math.min(132, size.height * 0.2)
  const fit = Math.min(width / box.width, height / box.height)
  const cardFit = Math.min(width / CARD.width, height / CARD.height) / unit
  // Aim for at least 13px labels (18px at local scale 1). A crowded level
  // can be panned when displaying the whole group would make it illegible.
  const readable = Math.min(13 / (18 * unit), cardFit)
  const zoom = Math.max(readable, Math.min(fit, 1.12 / unit))
  const p = center(box)
  return {
    home: {
      x: size.width / 2 - p.x * zoom,
      y: size.height / 2 - p.y * zoom,
      zoom,
    },
    minZoom: Math.max(readable, zoom * 0.82),
    maxZoom: Math.min(cardFit, 1.45 / unit, zoom * 1.35),
  }
}

// Keep the point under the canvas center and the user's relative magnification on resize.
export function reframe(
  view: Viewport,
  old: ReturnType<typeof framing>,
  next: ReturnType<typeof framing>,
  oldSize: Size,
  nextSize: Size,
): Viewport {
  const oldHome = old.home,
    nextHome = next.home
  const oldRatio = view.zoom / oldHome.zoom
  const zoom = Math.max(
    next.minZoom,
    Math.min(next.maxZoom, nextHome.zoom * oldRatio),
  )
  const ratio = zoom / nextHome.zoom
  const axis = (k: 'x' | 'y', length: 'width' | 'height') =>
    nextSize[length] / 2 +
    (nextHome[k] - nextSize[length] / 2) * ratio +
    ((view[k] -
      oldSize[length] / 2 -
      (oldHome[k] - oldSize[length] / 2) * oldRatio) *
      zoom) /
      view.zoom
  return { x: axis('x', 'width'), y: axis('y', 'height'), zoom }
}
