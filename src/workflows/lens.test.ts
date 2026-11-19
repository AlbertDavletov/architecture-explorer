import { expect, it } from 'vitest'
import { architecture, createArchitecture } from '../model/architecture'
import fixture from './upload-image.json'
import { parseWorkflow } from './model'
import { projectParticipation, projectStep, stepContext } from './projection'
import { contextRoute } from '../graph/navigation'

const workflow = parseWorkflow(fixture, architecture)
it('projects only participating endpoints and their containing ancestors', () => {
  expect([...projectParticipation(workflow, architecture)]).toEqual([
    ['clients', 'contains'],
    ['cloud', 'contains'],
  ])
  expect(
    Object.fromEntries(projectParticipation(workflow, architecture, 'cloud')),
  ).toEqual({
    services: 'contains',
    storage: 'unrelated',
    assets: 'contains',
    collaboration: 'unrelated',
  })
  expect(
    Object.fromEntries(projectParticipation(workflow, architecture, 'assets')),
  ).toEqual({
    uploads: 'participating',
    catalog: 'participating',
    processing: 'participating',
  })
  expect(
    Object.fromEntries(projectParticipation(workflow, architecture, 'web')),
  ).toEqual({
    shell: 'participating',
    editor: 'unrelated',
  })
})
it('finds the deepest real interaction context, including cross-branch overview edges', () => {
  expect(
    workflow.steps.map((s) => {
      const target = stepContext(s, architecture)
      expect(target.status).toBe('available')
      return target.status === 'available' ? target.parent : 'invalid'
    }),
  ).toEqual([undefined, 'cloud', 'assets', 'assets', undefined])
  const internal = projectStep(workflow.steps[2], architecture)
  expect(internal).toMatchObject({ status: 'internal', component: 'cloud' })
  const destination = stepContext(workflow.steps[2], architecture)
  expect(destination).toMatchObject({
    status: 'available',
    parent: 'assets',
    projection: { status: 'visible', edgeId: 'uploads/event/processing' },
  })
  expect(
    stepContext({ ...workflow.steps[0], to: 'missing' }, architecture).status,
  ).toBe('unavailable')
})
it('uses a truthful internal fallback when an ancestor endpoint cannot be exposed as a sibling edge', () => {
  const model = createArchitecture({
    components: [...architecture.components.values()],
    relationships: [{ from: 'assets', to: 'uploads', kind: 'data' }],
  })
  expect(
    stepContext(
      { id: 'nested', from: 'assets', to: 'uploads', kind: 'data' },
      model,
    ),
  ).toMatchObject({
    status: 'available',
    parent: 'cloud',
    projection: { status: 'internal', component: 'assets' },
  })
})
it('plans the lowest common ancestor and every adjacent boundary, never jumping branches', () => {
  expect(contextRoute('web', 'assets')).toEqual({
    common: undefined,
    contexts: ['web', 'clients', undefined, 'cloud', 'assets'],
  })
  expect(contextRoute('storage', 'assets')).toEqual({
    common: 'cloud',
    contexts: ['storage', 'cloud', 'assets'],
  })
  expect(contextRoute(undefined, 'assets').contexts).toEqual([
    undefined,
    'cloud',
    'assets',
  ])
  expect(contextRoute('assets', 'assets').contexts).toEqual(['assets'])
})
