import { describe, expect, it } from 'vitest'
import { ancestry, children, components, project } from './architecture'

describe('architecture projection', () => {
  it('preserves hierarchy and ancestor order', () => {
    expect(children().map((c) => c.id)).toEqual(['clients', 'cloud'])
    expect(children('cloud').map((c) => c.id)).toEqual([
      'services',
      'storage',
      'assets',
      'notifications',
      'sharing',
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
    expect(project('storage').edges).toEqual([
      { from: 'records', to: 'files', kind: 'data' },
    ])
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
