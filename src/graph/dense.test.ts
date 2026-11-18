import { expect, it } from 'vitest'
import dense from '../model/dense.json'
import { createArchitecture, type Architecture } from '../model/architecture'
import { buildWorld, framing } from './layout'
import { route } from './routing'
import { intersectsInterior, sharedLength } from './routing.test-utils'
const model = createArchitecture(dense as Architecture)

it.each([
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
])('has stable readable layout at $width', (size) => {
  const world = buildWorld(size.width < 660, model.children)
  expect(buildWorld(size.width < 660, model.children)).toEqual(world)
  const bounds = framing(world, size)
  expect(bounds.minZoom).toBeGreaterThan(0)
  expect(bounds.home.zoom).toBeGreaterThanOrEqual(bounds.minZoom)
  expect(bounds.home.zoom).toBeLessThanOrEqual(bounds.maxZoom)
  expect(Object.values(bounds.home).every(Number.isFinite)).toBe(true)
})

it('detects thin rectangle crossings exactly while allowing boundary contact', () => {
  const rect = { x: 1, y: 1, width: 0.001, height: 2 }
  expect(intersectsInterior([0, 2], [100, 2], rect)).toBe(true)
  expect(intersectsInterior([0, 1], [100, 1], rect)).toBe(false)
  expect(sharedLength([0, 0], [10, 0], [5, 0], [15, 0])).toBe(5)
})

it('aggregates 28 dependencies into 13 typed directed relationships', () => {
  expect(dense.relationships).toHaveLength(28)
  const graph = model.project()
  expect(graph.nodes).toHaveLength(7)
  expect(graph.edges).toHaveLength(13)
  expect(graph.edges).toEqual(
    expect.arrayContaining([
      { from: 'workspace', to: 'documents', kind: 'request' },
      { from: 'workspace', to: 'documents', kind: 'event' },
      { from: 'documents', to: 'workspace', kind: 'data' },
    ]),
  )
  expect(graph.edges.every((e) => e.from !== e.to)).toBe(true)
  expect(model.project('workspace').edges).toEqual([
    { from: 'workspace-a', to: 'workspace-b', kind: 'data' },
  ])
})
it.each([false, true])(
  'routes dense connections without card intersections or shared segments (vertical=%s)',
  (vertical) => {
    const world = buildWorld(vertical, model.children),
      graph = model.project()
    const ids = graph.nodes.map((n) => n.id)
    const sorted = graph.edges
      .map((e) => [e.from, e.kind, e.to].join('/'))
      .sort()
    const paths = graph.edges.map((e) => {
      const backwards = ids.indexOf(e.from) > ids.indexOf(e.to)
      const a = world.places.get(backwards ? e.to : e.from)!,
        b = world.places.get(backwards ? e.from : e.to)!
      const channel =
        -10 +
        (20 * sorted.indexOf([e.from, e.kind, e.to].join('/'))) /
          (sorted.length - 1)
      return route(a, b, vertical, 0, channel)!.map(([x, y]) => [
        a.box.x + x * a.scale,
        a.box.y + y * a.scale,
      ])
    })
    for (const points of paths) {
      expect(points.length).toBeLessThanOrEqual(6)
      for (let i = 1; i < points.length; i++)
        for (const id of ids)
          expect(
            intersectsInterior(
              points[i - 1],
              points[i],
              world.places.get(id)!.box,
            ),
          ).toBe(false)
    }
    for (let p = 0; p < paths.length; p++)
      for (let q = p + 1; q < paths.length; q++)
        for (let i = 1; i < paths[p].length; i++)
          for (let j = 1; j < paths[q].length; j++)
            expect(
              sharedLength(
                paths[p][i - 1],
                paths[p][i],
                paths[q][j - 1],
                paths[q][j],
              ),
            ).toBe(0)
    expect(buildWorld(vertical, model.children)).toEqual(world)
  },
)
it('keeps all six direction/type lanes outside cards', () => {
  const world = buildWorld(false, model.children)
  for (let lane = -2.5; lane <= 2.5; lane++) {
    const a = world.places.get('workspace')!,
      b = world.places.get('updates')!
    const points = route(a, b, false, lane)!
    for (let i = 1; i < points.length; i++)
      for (const c of model.children())
        expect(
          intersectsInterior(
            points[i - 1].map((v, k) => v + (k ? a.box.y : a.box.x)),
            points[i].map((v, k) => v + (k ? a.box.y : a.box.x)),
            world.places.get(c.id)!.box,
          ),
        ).toBe(false)
  }
})
