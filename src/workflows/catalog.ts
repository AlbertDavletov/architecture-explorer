import uploadImage from './upload-image.json'
import openDocument from './open-document.json'
import saveChanges from './save-changes.json'
import { parseWorkflow, type ArchitectureModel } from './model'

// Array order is the selector order; each JSON's step order is execution order.
const definitions: unknown[] = [uploadImage, openDocument, saveChanges]

export function createWorkflowCatalog(
  model: ArchitectureModel,
  entries: unknown[] = definitions,
) {
  const ids = new Set<string>()
  return entries.map((entry) => {
    const workflow = parseWorkflow(entry, model)
    if (ids.has(workflow.id))
      throw new Error(`Duplicate workflow ID: ${workflow.id}`)
    ids.add(workflow.id)
    for (const step of workflow.steps) {
      if (!step.name?.trim() || step.name.length > 40)
        throw new Error(
          `Step "${step.id}" needs a short name (1–40 characters).`,
        )
    }
    return workflow
  })
}
