import { expect, it } from 'vitest'
import { buildWorld, framing, reframe } from './layout'

it.each([
  { width: 320, height: 480 },
  { width: 390, height: 740 },
  { width: 1120, height: 720 },
  { width: 1920, height: 1080 },
])('keeps useful zoom ordered at $width × $height', (size) => {
  const world = buildWorld(size.width < 660)
  for (const parent of [undefined, 'cloud', 'storage']) {
    const f = framing(world, size, parent)
    expect(f.minZoom).toBeGreaterThan(0)
    expect(f.home.zoom).toBeGreaterThanOrEqual(f.minZoom)
    expect(f.home.zoom).toBeLessThanOrEqual(f.maxZoom)
    const unit = parent ? world.places.get(parent)!.childScale : 1
    expect(18 * unit * f.minZoom).toBeGreaterThanOrEqual(13 - 1e-8)
    expect(224 * unit * f.maxZoom).toBeLessThanOrEqual(size.width)
  }
})
it('preserves a view on identical sizes and clamps resized magnification', () => {
  const size = { width: 1120, height: 720 },
    small = { width: 390, height: 740 }
  const a = framing(buildWorld(false), size, 'storage')
  const b = framing(buildWorld(true), small, 'storage')
  const view = { ...a.home, x: a.home.x + 35, y: a.home.y - 20 }
  const same = reframe(view, a, a, size, size)
  expect(same.x).toBeCloseTo(view.x)
  expect(same.y).toBeCloseTo(view.y)
  const next = reframe({ ...view, zoom: a.maxZoom }, a, b, size, small)
  expect(next.zoom).toBeGreaterThanOrEqual(b.minZoom)
  expect(next.zoom).toBeLessThanOrEqual(b.maxZoom)
  expect(Object.values(next).every(Number.isFinite)).toBe(true)
})
