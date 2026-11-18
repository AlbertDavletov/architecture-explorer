import type { MapNode } from '../graph/ComponentNode'
import type { MapEdge } from '../graph/SignalEdge'
import type { ProjectedStep, Participation } from './projection'
import type { WorkflowPlayback } from './useWorkflow'

export type Emphasis = 'related' | 'current' | 'done' | 'dimmed'
export interface WorkflowSignal {
  token: string
  reduced: boolean
  measure: (duration: number) => void
  finish: () => void
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
    playback.status === 'focusing' || playback.status === 'animating'
      ? playback.current
      : undefined
  const completed = projections.slice(0, playback.completedCount)
  const doneNodes = new Set(completed.flatMap((p) => p.nodes))
  const doneEdges = new Set(
    completed.flatMap((p) => (p.status === 'visible' ? [p.edgeId] : [])),
  )
  return {
    nodes: graph.nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        participation: participation?.get(n.id),
        emphasis: (active?.nodes.includes(n.id)
          ? 'current'
          : doneNodes.has(n.id)
            ? 'done'
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
            : doneEdges.has(e.id)
              ? 'done'
              : edges.has(e.id)
                ? 'related'
                : 'dimmed') as Emphasis,
          signal:
            current && playback.status === 'animating'
              ? {
                  token: playback.token,
                  reduced: playback.reduced,
                  measure: playback.measure,
                  finish: playback.finish,
                }
              : undefined,
        },
      }
    }),
  }
}
