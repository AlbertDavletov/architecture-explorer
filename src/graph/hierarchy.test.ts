import { expect, it } from 'vitest'
import {
  ancestry,
  children,
  components,
  depth,
  project,
} from '../model/architecture'
import fixture from '../model/architecture.json'
import { buildWorld, framing } from './layout'
import { scene } from './scene'
import { intersectsInterior } from './routing.test-utils'

it('has a five-level fictional hierarchy with uneven branches and valid dependencies', () => {
  expect(components.size).toBe(29)
  expect(depth).toBe(5)
  expect(ancestry('compositor').map((c) => c.id)).toEqual([
    'clients',
    'web',
    'editor',
    'rendering',
    'compositor',
  ])
  expect(ancestry('desktop')).toHaveLength(2)
  expect(children('rendering')).toHaveLength(4)
  expect(children('clients')).toHaveLength(3)
  for (const e of fixture.relationships) {
    expect(components.has(e.from)).toBe(true)
    expect(components.has(e.to)).toBe(true)
  }
})
it('merges repeated cross-subsystem dependencies but preserves bidirectional signals', () => {
  expect(project().edges).toHaveLength(3)
  expect(project('editor').edges).toEqual(
    expect.arrayContaining([
      { from: 'document-state', to: 'history', kind: 'data' },
      { from: 'history', to: 'document-state', kind: 'data' },
    ]),
  )
  expect(project('files')).toEqual({ nodes: [], edges: [] })
  expect(project('missing')).toEqual({ nodes: [], edges: [] })
})
it.each([
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
])(
  'keeps every area separate, readable and collision-free at $width',
  (size) => {
    const world = buildWorld(size.width < 660)
    for (const parent of [undefined, ...components.keys()]) {
      const ids = children(parent).map((c) => c.id)
      const boxes = ids.map((id) => world.places.get(id)!.box)
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
      const view = framing(world, size, parent)
      expect(view.minZoom).toBeGreaterThan(0)
      expect(view.minZoom).toBeLessThanOrEqual(view.home.zoom)
      expect(view.home.zoom).toBeLessThanOrEqual(view.maxZoom)
      const graph = scene(
        world,
        parent,
        undefined,
        undefined,
        true,
        () => {},
        () => {},
      )
      expect(
        graph.nodes.filter((n) => n.data.shell === 'closed').map((n) => n.id),
      ).toEqual(ids)
      expect(graph.nodes.length).toBeLessThanOrEqual(ids.length + 1)
      for (const edge of graph.edges) {
        expect(ids).toContain(edge.source)
        expect(ids).toContain(edge.target)
        const source = world.places.get(edge.source)!
        const points = edge.data!.route
        if (!points) continue
        const worldPoints = points.map(([x, y]) => [
          source.box.x + x * source.scale,
          source.box.y + y * source.scale,
        ])
        for (let i = 1; i < worldPoints.length; i++)
          for (const box of boxes)
            expect(
              intersectsInterior(worldPoints[i - 1], worldPoints[i], box),
            ).toBe(false)
      }
    }
  },
)
