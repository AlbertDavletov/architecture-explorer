import { expect, it } from 'vitest'
import { architecture } from '../model/architecture'
import { createWorkflowCatalog } from './catalog'
import { interactionError } from './model'
import { projectParticipation, projectStep, stepContext } from './projection'

const catalog = createWorkflowCatalog(architecture)

it('loads three uniquely identified workflows in authored order, with valid named steps', () => {
  expect(catalog.map((workflow) => workflow.id)).toEqual([
    'upload-image',
    'open-document',
    'save-changes',
  ])
  expect(catalog.map((workflow) => workflow.steps.length)).toEqual([5, 5, 6])
  expect(new Set(catalog.map((workflow) => workflow.id)).size).toBe(3)
  for (const workflow of catalog) {
    expect(new Set(workflow.steps.map((step) => step.id)).size).toBe(
      workflow.steps.length,
    )
    for (const step of workflow.steps) {
      expect(interactionError(step, architecture)).toBeUndefined()
      expect(step.name?.trim().length).toBeGreaterThan(0)
      expect(step.name!.length).toBeLessThanOrEqual(40)
    }
  }
  expect(createWorkflowCatalog(architecture)).toEqual(catalog)
})

it('rejects duplicate workflow IDs, including non-adjacent duplicates', () => {
  expect(() =>
    createWorkflowCatalog(architecture, [...catalog, catalog[0]]),
  ).toThrow(/Duplicate workflow ID/)
})

it.each([
  { name: undefined },
  { name: '' },
  { name: ' ' },
  { name: 'x'.repeat(41) },
  { from: 'missing' },
  { from: 'gateway', to: 'pages' },
  { kind: 'event' },
])('rejects invalid catalog steps: %j', (change) => {
  const workflow = catalog[0]
  expect(() =>
    createWorkflowCatalog(architecture, [
      {
        ...workflow,
        steps: [{ ...workflow.steps[0], ...change }],
      },
    ]),
  ).toThrow()
})

it('rejects invalid definitions anywhere in the catalog, without silently skipping them', () => {
  expect(() => createWorkflowCatalog(architecture, [...catalog, {}])).toThrow()
  expect(() =>
    createWorkflowCatalog(architecture, [
      {
        ...catalog[1],
        steps: [catalog[1].steps[0], catalog[1].steps[0]],
      },
    ]),
  ).toThrow(/Duplicate step ID/)
})

it.each(catalog)(
  'projects $name truthfully at every level and finds a visible destination',
  (workflow) => {
    for (const step of workflow.steps) {
      const context = stepContext(step, architecture)
      expect(context.status).toBe('available')
      if (context.status !== 'available') throw new Error(context.error)
      expect(context.projection.status).toBe('visible')
      for (const parent of [undefined, ...architecture.components.keys()]) {
        const projection = projectStep(step, architecture, parent)
        expect(projection.status).not.toBe('invalid')
        if (projection.status === 'visible') {
          expect(architecture.project(parent).edges).toContainEqual({
            from: projection.from,
            to: projection.to,
            kind: step.kind,
          })
        }
        if (projection.status === 'internal') {
          expect(architecture.ancestry(step.from).map((c) => c.id)).toContain(
            projection.component,
          )
          expect(architecture.ancestry(step.to).map((c) => c.id)).toContain(
            projection.component,
          )
        }
      }
    }
  },
)

it('exposes distinct routes and updates the lens, including discoverable ancestors', () => {
  const contexts = catalog.map((workflow) =>
    workflow.steps.map((step) => {
      const context = stepContext(step, architecture)
      return context.status === 'available' ? context.parent : 'invalid'
    }),
  )
  expect(contexts).toEqual([
    [undefined, 'cloud', 'assets', 'assets', undefined],
    [undefined, 'cloud', 'cloud', undefined, 'editor'],
    ['editor', 'editor', undefined, 'cloud', 'cloud', undefined],
  ])
  expect(
    catalog.map((workflow) =>
      Object.fromEntries(projectParticipation(workflow, architecture, 'cloud')),
    ),
  ).toEqual([
    {
      services: 'contains',
      storage: 'unrelated',
      assets: 'contains',
      notifications: 'unrelated',
      sharing: 'unrelated',
    },
    {
      services: 'contains',
      storage: 'contains',
      assets: 'unrelated',
      notifications: 'unrelated',
      sharing: 'unrelated',
    },
    {
      services: 'contains',
      storage: 'contains',
      assets: 'unrelated',
      notifications: 'participating',
      sharing: 'unrelated',
    },
  ])
  expect([
    ...projectParticipation(catalog[1], architecture, 'assets').values(),
  ]).toEqual(Array(4).fill('unrelated'))
  expect(projectParticipation(catalog[1], architecture).get('clients')).toBe(
    'contains',
  )
  expect(
    projectParticipation(catalog[1], architecture, 'web').get('editor'),
  ).toBe('contains')
})
