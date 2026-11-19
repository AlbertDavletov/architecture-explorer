import { describe, expect, it } from 'vitest'
import {
  ancestry,
  children,
  components,
  project,
  createArchitecture,
  type Architecture,
} from './architecture'
import fixture from './architecture.json'

const valid = fixture as Architecture

it.each([
  [
    'duplicate IDs',
    { ...valid, components: [...valid.components, valid.components[0]] },
    /unique/,
  ],
  [
    'missing parent',
    { ...valid, components: [{ ...valid.components[0], parent: 'missing' }] },
    /Unknown parent/,
  ],
  [
    'blank name',
    { ...valid, components: [{ ...valid.components[0], name: ' ' }] },
    /nonempty/,
  ],
  [
    'parent cycle',
    {
      ...valid,
      components: [{ ...valid.components[0], parent: 'clients' }],
      relationships: [],
    },
    /Circular parent/,
  ],
  [
    'missing endpoint',
    {
      ...valid,
      relationships: [{ from: 'clients', to: 'missing', kind: 'data' }],
    },
    /Unknown relationship/,
  ],
  [
    'self relationship',
    {
      ...valid,
      relationships: [{ from: 'clients', to: 'clients', kind: 'data' }],
    },
    /Invalid relationship/,
  ],
  [
    'unknown signal',
    {
      ...valid,
      relationships: [{ from: 'clients', to: 'cloud', kind: 'other' }],
    },
    /Invalid relationship/,
  ],
] as const)('rejects %s before rendering', (_name, value, message) => {
  expect(() => createArchitecture(value as unknown as Architecture)).toThrow(
    message,
  )
})

it('keeps aggregation stable with repeated relationships and reordered components', () => {
  const model = createArchitecture({
    components: [...valid.components].reverse(),
    relationships: [...valid.relationships, ...valid.relationships],
  })
  for (const parent of [undefined, ...components.keys()]) {
    expect(model.project(parent).edges).toEqual(project(parent).edges)
  }
  expect(model.depth).toBe(5)
})

describe('architecture projection', () => {
  it('preserves hierarchy and ancestor order', () => {
    expect(children().map((c) => c.id)).toEqual(['clients', 'cloud'])
    expect(children('cloud').map((c) => c.id)).toEqual([
      'services',
      'assets',
      'storage',
      'collaboration',
    ])
    expect(ancestry('files').map((c) => c.id)).toEqual([
      'cloud',
      'storage',
      'files',
    ])
    expect(ancestry()).toEqual([])
  })
  it('aggregates by direction and signal type', () => {
    expect(project().edges).toEqual([
      { from: 'clients', to: 'cloud', kind: 'request' },
      { from: 'cloud', to: 'clients', kind: 'data' },
      { from: 'cloud', to: 'clients', kind: 'event' },
    ])
    expect(project('cloud').edges).toEqual(
      expect.arrayContaining([
        { from: 'services', to: 'storage', kind: 'request' },
        { from: 'storage', to: 'services', kind: 'data' },
      ]),
    )
    expect(project('storage').edges).toEqual([])
  })
  it('only connects distinct visible siblings in every area', () => {
    for (const parent of [undefined, ...components.keys()]) {
      const { nodes, edges } = project(parent)
      const ids = nodes.map((n) => n.id)
      for (const edge of edges) {
        expect(ids).toContain(edge.from)
        expect(ids).toContain(edge.to)
        expect(edge.from).not.toBe(edge.to)
      }
      expect(new Set(edges.map((e) => JSON.stringify(e))).size).toBe(
        edges.length,
      )
    }
  })
})
