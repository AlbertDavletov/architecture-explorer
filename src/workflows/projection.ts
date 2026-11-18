import {
  interactionError,
  type ArchitectureModel,
  type WorkflowStep,
  type Workflow,
} from './model'

export type ProjectedStep =
  | { status: 'invalid'; error: string; nodes: string[] }
  | { status: 'internal'; component: string; nodes: string[] }
  | { status: 'outside'; nodes: string[] }
  | {
      status: 'visible'
      from: string
      to: string
      kind: WorkflowStep['kind']
      edgeId: string
      nodes: string[]
    }

export function projectStep(
  step: WorkflowStep,
  model: ArchitectureModel,
  parent?: string,
): ProjectedStep {
  // Validate the exact logical interaction before folding it into ancestors.
  const error = interactionError(step, model)
  if (error) return { status: 'invalid', error, nodes: [] }
  const graph = model.project(parent)
  const visible = new Set(graph.nodes.map((n) => n.id))
  const resolve = (id: string) =>
    model.ancestry(id).find((c) => visible.has(c.id))?.id
  const from = resolve(step.from),
    to = resolve(step.to)
  const nodes = [...new Set([from, to].filter((id): id is string => !!id))]
  if (!from || !to) return { status: 'outside', nodes }
  if (from === to) return { status: 'internal', component: from, nodes }
  if (
    !graph.edges.some(
      (e) => e.from === from && e.to === to && e.kind === step.kind,
    )
  )
    return {
      status: 'invalid',
      error: `No visible relationship for step "${step.id}".`,
      nodes,
    }
  return {
    status: 'visible',
    from,
    to,
    kind: step.kind,
    edgeId: [from, step.kind, to].join('/'),
    nodes,
  }
}

export type Participation = 'participating' | 'contains' | 'unrelated'

export function projectParticipation(
  workflow: Workflow,
  model: ArchitectureModel,
  parent?: string,
) {
  const endpoints = new Set(
    workflow.steps.flatMap((step) => [step.from, step.to]),
  )
  const ancestors = new Set(
    [...endpoints].flatMap((id) =>
      model
        .ancestry(id)
        .slice(0, -1)
        .map((c) => c.id),
    ),
  )
  return new Map(
    model
      .children(parent)
      .map(
        (c) =>
          [
            c.id,
            endpoints.has(c.id)
              ? 'participating'
              : ancestors.has(c.id)
                ? 'contains'
                : 'unrelated',
          ] as [string, Participation],
      ),
  )
}

export type StepContext =
  | { status: 'available'; parent?: string; projection: ProjectedStep }
  | { status: 'unavailable'; error: string }

// The deepest shared container that exposes a real projected edge. An endpoint
// that is itself an ancestor may only have an internal representation; use that
// instead of inventing an edge or navigating into a misleading child branch.
export function stepContext(
  step: WorkflowStep,
  model: ArchitectureModel,
): StepContext {
  const error = interactionError(step, model)
  if (error) return { status: 'unavailable', error }
  const destination = new Set(model.ancestry(step.to).map((c) => c.id))
  const candidates = [
    ...model
      .ancestry(step.from)
      .filter((c) => destination.has(c.id))
      .map((c) => c.id)
      .reverse(),
    undefined,
  ]
  let internal: StepContext | undefined
  for (const parent of candidates) {
    const projection = projectStep(step, model, parent)
    if (projection.status === 'visible')
      return { status: 'available', parent, projection }
    if (!internal && projection.status === 'internal')
      internal = { status: 'available', parent, projection }
  }
  return (
    internal ?? {
      status: 'unavailable',
      error: 'This interaction has no architectural context.',
    }
  )
}
