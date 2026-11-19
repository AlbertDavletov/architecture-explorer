import type { architecture } from '../model/architecture'

type ArchitectureModel = typeof architecture
export interface Resource {
  title: string
  url: string
}
export interface Description {
  name: string
  description?: string
}
export interface ComponentDetails {
  summary?: string
  owner?: string
  source?: Resource
  documentation?: Resource[]
  usedBy?: string[]
  featureFlags?: Description[]
  metrics?: Description[]
  tests?: Resource[]
  resources?: Resource[]
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

export function isExternalUrl(value: unknown): value is string {
  if (
    !text(value) ||
    !/^https?:\/\//i.test(value) ||
    /[\s\u0000-\u001f\u007f]/.test(value)
  )
    return false
  try {
    const url = new URL(value)
    return (
      ['https:', 'http:'].includes(url.protocol) &&
      !!url.hostname &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}
const resource = (value: unknown): value is Resource =>
  record(value) && text(value.title) && isExternalUrl(value.url)
const description = (value: unknown): value is Description =>
  record(value) &&
  text(value.name) &&
  (value.description === undefined || text(value.description))

function parseDetails(
  value: unknown,
  model: ArchitectureModel,
): ComponentDetails | undefined {
  if (!record(value)) return
  const details: ComponentDetails = {}
  for (const key of ['summary', 'owner'] as const) {
    if (value[key] === undefined) continue
    if (!text(value[key])) return
    details[key] = value[key]
  }
  if (value.source !== undefined) {
    if (!resource(value.source)) return
    details.source = value.source
  }
  for (const key of ['documentation', 'tests', 'resources'] as const) {
    if (value[key] === undefined) continue
    if (!Array.isArray(value[key]) || !value[key].every(resource)) return
    if (value[key].length) details[key] = value[key]
  }
  for (const key of ['featureFlags', 'metrics'] as const) {
    if (value[key] === undefined) continue
    if (!Array.isArray(value[key]) || !value[key].every(description)) return
    if (value[key].length) details[key] = value[key]
  }
  if (value.usedBy !== undefined) {
    if (
      !Array.isArray(value.usedBy) ||
      !value.usedBy.every((id) => text(id) && model.components.has(id))
    )
      return
    if (value.usedBy.length) details.usedBy = [...new Set(value.usedBy)]
  }
  return Object.keys(details).length ? details : undefined
}

// Invalid entries are ignored independently: bad optional metadata must never
// break the architecture or expose a misleading/unsafe Inspector action.
export function createDetailsCatalog(value: unknown, model: ArchitectureModel) {
  const entries = new Map<string, ComponentDetails>()
  if (!record(value) || !record(value.components)) return entries
  for (const [id, raw] of Object.entries(value.components)) {
    if (!model.components.has(id) || model.children(id).length) continue
    const details = parseDetails(raw, model)
    if (details) entries.set(id, details)
  }
  return entries
}
