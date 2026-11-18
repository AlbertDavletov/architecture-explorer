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
import { route } from './routing'

it('has a five-level fictional hierarchy with uneven branches and valid dependencies', () => {
  expect(components.size).toBe(35)
  expect(depth).toBe(5)
  expect(ancestry('compositor').map((c) => c.id)).toEqual([
    'clients',
    'web',
    'editor',
    'rendering',
    'compositor',
  ])
  expect(ancestry('desktop')).toHaveLength(2)
  expect(children('rendering')).toHaveLength(5)
  expect(children('clients')).toHaveLength(5)
  for (const e of fixture.relationships) {
    expect(components.has(e.from)).toBe(true)
    expect(components.has(e.to)).toBe(true)
  }
})
it('merges repeated cross-subsystem dependencies but preserves bidirectional signals', () => {
  expect(project().edges).toHaveLength(3)
  expect(project('editor').edges).toEqual(
    expect.arrayContaining([
      { from: 'authoring', to: 'rendering', kind: 'data' },
      { from: 'rendering', to: 'authoring', kind: 'event' },
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
        const source = world.places.get(edge.source)!,
          target = world.places.get(edge.target)!
        const points = route(source, target, world.vertical, edge.data!.lane)
        if (!points) continue
        // Every segment must avoid the interior of every visible card.
        for (let i = 1; i < points.length; i++) {
          const [x1, y1] = points[i - 1],
            [x2, y2] = points[i]
          for (let t = 0; t <= 1; t += 0.05) {
            const x = source.box.x + (x1 + (x2 - x1) * t) * source.scale
            const y = source.box.y + (y1 + (y2 - y1) * t) * source.scale
            expect(
              boxes.some(
                (b) =>
                  x > b.x + 1e-7 &&
                  x < b.x + b.width - 1e-7 &&
                  y > b.y + 1e-7 &&
                  y < b.y + b.height - 1e-7,
              ),
            ).toBe(false)
          }
        }
      }
    }
  },
)
