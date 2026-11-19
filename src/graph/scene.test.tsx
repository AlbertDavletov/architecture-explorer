import { act, cleanup, renderHook } from '@testing-library/react'
import { ReactFlowProvider, useStoreApi } from '@xyflow/react'
import { afterEach, expect, it } from 'vitest'
import { architecture } from '../model/architecture'
import { buildWorld } from './layout'
import { scene } from './scene'

afterEach(cleanup)

it.each([false, true])(
  'keeps edge anchors initialized across controlled lens updates (vertical=%s)',
  (vertical) => {
    const { result } = renderHook(() => useStoreApi(), {
      wrapper: ReactFlowProvider,
    })
    const world = buildWorld(vertical)
    // Use the real React Flow store without a DOM ResizeObserver. Every update
    // must keep edges renderable, even when node geometry has not changed.
    for (const parent of [undefined, ...architecture.components.keys()]) {
      const graph = scene(
        world,
        parent,
        undefined,
        undefined,
        true,
        () => {},
        () => {},
      )
      for (const emphasis of [
        'related',
        'current',
        'done',
        'dimmed',
      ] as const) {
        act(() =>
          result.current.getState().setNodes(
            graph.nodes.map((node) => ({
              ...node,
              data: { ...node.data, emphasis },
            })),
          ),
        )
        const lookup = result.current.getState().nodeLookup
        for (const edge of graph.edges) {
          const source = lookup.get(edge.source)!
          const target = lookup.get(edge.target)!
          const out = source.internals.handleBounds?.source?.find(
            (h) => h.id === edge.sourceHandle,
          )
          const into = target.internals.handleBounds?.target?.find(
            (h) => h.id === edge.targetHandle,
          )
          expect(out).toBeDefined()
          expect(into).toBeDefined()
          expect(out).toMatchObject(
            vertical
              ? { x: source.width! / 2, y: source.height, position: 'bottom' }
              : { x: source.width, y: source.height! / 2, position: 'right' },
          )
          expect(into).toMatchObject(
            vertical
              ? { x: target.width! / 2, y: 0, position: 'top' }
              : { x: 0, y: target.height! / 2, position: 'left' },
          )
        }
      }
    }
  },
)
