import type { architecture, SignalKind } from '../model/architecture'

export type ArchitectureModel = typeof architecture
export interface WorkflowStep {
  id: string
  from: string
  to: string
  kind: SignalKind
  description?: string
}
export interface Workflow {
  id: string
  name: string
  description?: string
  // Explicit execution mode and stable step IDs leave room for a future
  // discriminated parallel/branching model without pretending to execute it now.
  execution: 'sequence'
  steps: WorkflowStep[]
}

export function interactionError(step: WorkflowStep, model: ArchitectureModel) {
  if (!model.components.has(step.from) || !model.components.has(step.to))
    return `Step "${step.id}" references an unknown component.`
  if (
    !model.relationships.some(
      (r) => r.from === step.from && r.to === step.to && r.kind === step.kind,
    )
  )
    return `Step "${step.id}" has no matching ${step.kind} relationship: ${step.from} → ${step.to}.`
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

export function parseWorkflow(
  value: unknown,
  model: ArchitectureModel,
): Workflow {
  if (
    !record(value) ||
    !text(value.id) ||
    !text(value.name) ||
    value.execution !== 'sequence' ||
    (value.description !== undefined && !text(value.description)) ||
    !Array.isArray(value.steps) ||
    !value.steps.length
  )
    throw new Error(
      'A workflow needs an ID, name, sequence execution and nonempty steps.',
    )
  const seen = new Set<string>()
  for (const step of value.steps) {
    if (
      !record(step) ||
      !text(step.id) ||
      !text(step.from) ||
      !text(step.to) ||
      !['request', 'data', 'event'].includes(String(step.kind)) ||
      (step.description !== undefined && !text(step.description))
    )
      throw new Error(
        'Each step needs an ID, source, destination and valid signal kind.',
      )
    if (seen.has(step.id)) throw new Error(`Duplicate step ID: ${step.id}`)
    seen.add(step.id)
    const error = interactionError(step as unknown as WorkflowStep, model)
    if (error) throw new Error(error)
  }
  return value as unknown as Workflow
}
