import { components, project } from '../model/architecture'
import type { World } from './layout'
import type { Exposure, MapNode, Shell } from './ComponentNode'
import type { MapEdge } from './SignalEdge'
import type { Journey } from './useSemanticZoom'

export function scene(
  world: World,
  parent: string | undefined,
  journey: Journey | undefined,
  selected: string | undefined,
  explored: boolean,
  select: (id: string) => void,
  enter: (id: string) => void,
) {
  const nodes = new Map<string, MapNode>()
  const edges: MapEdge[] = []
  function node(id: string, shell: Shell, exposure: Exposure) {
    const component = components.get(id)!
    const place = world.places.get(id)!
    nodes.set(id, {
      id,
      type: 'component',
      position: { x: place.box.x, y: place.box.y },
      width: place.box.width,
      height: place.box.height,
      zIndex: shell === 'closed' ? 3 : shell === 'opening' ? 1 : 0,
      data: {
        component,
        place,
        vertical: world.vertical,
        shell,
        exposure,
        interactive: !journey && shell === 'closed',
        selected: selected === id,
        showHint: !explored && selected === id && !journey,
        select,
        enter,
      },
    })
  }
  function layer(group: string | undefined, exposure: Exposure) {
    const graph = project(group)
    for (const component of graph.nodes) {
      if (component.id === journey?.inner)
        node(component.id, 'opening', 'steady')
      else node(component.id, 'closed', exposure)
    }
    const pairs = new Map<string, typeof graph.edges>()
    for (const edge of graph.edges) {
      const key = [edge.from, edge.to].sort().join('/')
      pairs.set(key, [...(pairs.get(key) ?? []), edge])
    }
    for (const signals of pairs.values())
      signals.forEach((edge, i) => {
        const backwards =
          graph.nodes.findIndex((n) => n.id === edge.from) >
          graph.nodes.findIndex((n) => n.id === edge.to)
        edges.push({
          id: [edge.from, edge.kind, edge.to].join('/'),
          type: 'signal',
          source: backwards ? edge.to : edge.from,
          target: backwards ? edge.from : edge.to,
          sourceHandle: 'out',
          targetHandle: 'in',
          ariaLabel: `${edge.kind} from ${components.get(edge.from)?.name} to ${components.get(edge.to)?.name}`,
          data: {
            kind: edge.kind,
            backwards,
            lane: i - (signals.length - 1) / 2,
            vertical: world.vertical,
            scale: world.places.get(edge.from)!.scale,
            exposure,
          },
        })
      })
  }
  const outer = journey ? journey.outer : parent
  if (outer) node(outer, 'boundary', journey ? 'outside' : 'steady')
  layer(outer, journey ? 'outside' : 'steady')
  if (journey) layer(journey.inner, 'inside')
  return { nodes: [...nodes.values()], edges }
}
