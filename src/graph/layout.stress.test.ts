import { expect, it, vi } from 'vitest'
const model = vi.hoisted(() => ({
  items: [] as { id: string; parent?: string }[],
}))
vi.mock('../model/architecture', () => ({
  children: (parent?: string) => model.items.filter((c) => c.parent === parent),
}))
import { buildWorld, framing } from './layout'

it.each([0, 1, 2, 3, 5, 8])(
  'handles %i siblings without invalid bounds or overlap',
  (count) => {
    model.items = Array.from({ length: count }, (_, i) => ({ id: String(i) }))
    for (const vertical of [false, true]) {
      const world = buildWorld(vertical)
      const view = framing(world, { width: vertical ? 390 : 1440, height: 900 })
      expect(Object.values(view.home).every(Number.isFinite)).toBe(true)
      expect(view.minZoom).toBeLessThanOrEqual(view.maxZoom)
      const boxes = [...world.places.values()].map((p) => p.box)
      boxes.forEach((a, i) =>
        boxes.slice(i + 1).forEach((b) => {
          expect(
            a.x + a.width <= b.x ||
              b.x + b.width <= a.x ||
              a.y + a.height <= b.y ||
              b.y + b.height <= a.y,
          ).toBe(true)
        }),
      )
    }
  },
)
it('resolves seven nested levels without a depth cap', () => {
  model.items = Array.from({ length: 7 }, (_, i) => ({
    id: String(i),
    parent: i ? String(i - 1) : undefined,
  }))
  const world = buildWorld(false)
  expect(world.places.size).toBe(7)
  for (const item of model.items) {
    const f = framing(world, { width: 1024, height: 768 }, item.id)
    expect(Number.isFinite(f.home.zoom)).toBe(true)
    expect(f.minZoom).toBeLessThanOrEqual(f.maxZoom)
  }
})
