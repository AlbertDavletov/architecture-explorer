import type { MapNode } from '../graph/ComponentNode'
import type { MapEdge } from '../graph/SignalEdge'
import type { ProjectedStep, Participation } from './projection'
import type { WorkflowPlayback } from './useWorkflow'

export type Emphasis = 'related' | 'current' | 'dimmed'
export interface WorkflowSignal {
  token: string
  reduced: boolean
  measure: (duration: number) => void
}

export function workflowOverlay(
  graph: { nodes: MapNode[]; edges: MapEdge[] },
  projections: ProjectedStep[],
  playback: WorkflowPlayback,
  navigating: boolean,
  participation?: Map<string, Participation>,
) {
  if (!playback.highlighted || navigating) return graph
  const nodes = new Set(projections.flatMap((p) => p.nodes))
  const edges = new Set(
    projections.flatMap((p) => (p.status === 'visible' ? [p.edgeId] : [])),
  )
  const active =
    playback.status === 'playing' || playback.status === 'paused'
      ? playback.current
      : undefined
  return {
    nodes: graph.nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        participation: participation?.get(n.id),
        emphasis: (active?.nodes.includes(n.id)
          ? 'current'
          : nodes.has(n.id) || n.data.shell === 'boundary'
            ? 'related'
            : 'dimmed') as Emphasis,
      },
    })),
    edges: graph.edges.map((e) => {
      const current = active?.status === 'visible' && active.edgeId === e.id
      return {
        ...e,
        data: {
          ...e.data!,
          emphasis: (current
            ? 'current'
            : edges.has(e.id)
              ? 'related'
              : 'dimmed') as Emphasis,
          signal:
            current && playback.status === 'playing'
              ? {
                  token: playback.token,
                  reduced: playback.reduced,
                  measure: playback.measure,
                }
              : undefined,
        },
      }
    }),
  }
}
