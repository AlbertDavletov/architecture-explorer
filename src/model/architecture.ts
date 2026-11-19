import fixture from './architecture.json'

export type SignalKind = 'request' | 'data' | 'event'
export type ComponentIcon =
  | 'devices'
  | 'cloud'
  | 'browser'
  | 'phone'
  | 'server'
  | 'storage'
  | 'inbox'
export interface Component {
  id: string
  parent?: string
  name: string
  description: string
  icon: ComponentIcon
  color: 'blue' | 'teal' | 'violet'
}
interface Relationship {
  from: string
  to: string
  kind: SignalKind
}
export interface Architecture {
  components: Component[]
  relationships: Relationship[]
}

export function createArchitecture(architecture: Architecture) {
  const components = new Map(
    architecture.components.map((component) => [component.id, component]),
  )
  const children = (parent?: string) =>
    architecture.components.filter((component) => component.parent === parent)

  if (components.size !== architecture.components.length)
    throw new Error('Architecture component IDs must be unique.')
  for (const component of components.values()) {
    if (!component.id.trim() || !component.name.trim())
      throw new Error('Architecture components need nonempty IDs and names.')
    if (component.parent !== undefined && !components.has(component.parent))
      throw new Error(
        `Unknown parent for "${component.id}": ${component.parent}`,
      )
  }
  for (const relation of architecture.relationships) {
    if (!components.has(relation.from) || !components.has(relation.to))
      throw new Error(
        `Unknown relationship endpoint: ${relation.from} → ${relation.to}`,
      )
    if (
      relation.from === relation.to ||
      !['request', 'data', 'event'].includes(relation.kind)
    )
      throw new Error(`Invalid relationship: ${relation.from} → ${relation.to}`)
  }

  function ancestry(id?: string): Component[] {
    const path: Component[] = []
    const seen = new Set<string>()
    let item = id ? components.get(id) : undefined
    while (item) {
      if (seen.has(item.id))
        throw new Error(
          `Circular parent in architecture fixture at "${item.id}"`,
        )
      seen.add(item.id)
      path.unshift(item)
      item = item.parent ? components.get(item.parent) : undefined
    }
    return path
  }

  const depth = Math.max(
    ...architecture.components.map((item) => ancestry(item.id).length),
  )
  const kinds: SignalKind[] = ['request', 'data', 'event']

  // Fold endpoints into the visible siblings, then merge identical directed signals.
  function project(parent?: string) {
    const nodes = children(parent)
    const ids = new Set(nodes.map((component) => component.id))
    const edges = new Map<string, Relationship>()
    for (const relation of architecture.relationships) {
      const from = ancestry(relation.from).find((component) =>
        ids.has(component.id),
      )?.id
      const to = ancestry(relation.to).find((component) =>
        ids.has(component.id),
      )?.id
      if (!from || !to || from === to) continue
      edges.set([from, to, relation.kind].join('/'), {
        from,
        to,
        kind: relation.kind,
      })
    }
    return {
      nodes,
      edges: [...edges.values()].sort(
        (a, b) => kinds.indexOf(a.kind) - kinds.indexOf(b.kind),
      ),
    }
  }

  return {
    components,
    children,
    ancestry,
    depth,
    project,
    relationships: architecture.relationships,
  }
}

// Keep the synthetic fixture out of the production import graph. Its module is
// only loaded when explicitly requested from the development server.
const selectedFixture =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('fixture') === 'dense'
    ? (await import('./dense.json')).default
    : fixture
export const architecture = createArchitecture(selectedFixture as Architecture)
export const { components, children, ancestry, depth, project } = architecture
