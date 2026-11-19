import { describe, expect, it } from 'vitest'
import fixture from '../model/architecture.json'
import { createArchitecture, type Architecture } from '../model/architecture'
import raw from './upload-image.json'
import { parseWorkflow } from './model'
import { projectStep } from './projection'

const model = createArchitecture(fixture as Architecture)
const workflow = parseWorkflow(raw, model)
describe('workflow JSON', () => {
  it('preserves explicit sequence, stable IDs, types and direction', () => {
    expect(workflow.steps.map((s) => s.id)).toEqual([
      'request',
      'transfer',
      'process',
      'catalog',
      'available',
    ])
    expect(workflow.steps.map((s) => s.kind)).toEqual([
      'request',
      'data',
      'event',
      'data',
      'data',
    ])
    expect(workflow.steps[0]).toMatchObject({ from: 'shell', to: 'gateway' })
    expect(workflow.steps[4]).toMatchObject({ from: 'catalog', to: 'shell' })
  })
  it.each([
    null,
    {},
    { ...raw, execution: 'parallel' },
    { ...raw, steps: [] },
    { ...raw, steps: [{ ...raw.steps[0], kind: 'invalid' }] },
    { ...raw, steps: [{ ...raw.steps[0], description: 3 }] },
    { ...raw, steps: [raw.steps[0], raw.steps[0]] },
  ])('rejects malformed definitions %#', (value) => {
    expect(() => parseWorkflow(value, model)).toThrow()
  })
  it('rejects unknown components and mismatched directions/types', () => {
    for (const change of [
      { from: 'missing' },
      { from: 'gateway', to: 'shell' },
      { kind: 'event' },
    ])
      expect(() =>
        parseWorkflow(
          { ...raw, steps: [{ ...raw.steps[0], ...change }] },
          model,
        ),
      ).toThrow()
  })
})
describe('workflow projection', () => {
  it('aggregates overview endpoints while keeping internal steps internal', () => {
    const projected = workflow.steps.map((s) => projectStep(s, model))
    expect(projected[0]).toMatchObject({
      status: 'visible',
      from: 'clients',
      to: 'cloud',
      kind: 'request',
      edgeId: 'clients/request/cloud',
    })
    expect(projected.slice(1, 4)).toEqual(
      Array(3).fill({
        status: 'internal',
        component: 'cloud',
        nodes: ['cloud'],
      }),
    )
    expect(projected[4]).toMatchObject({
      status: 'visible',
      from: 'cloud',
      to: 'clients',
      kind: 'data',
    })
  })
  it('resolves nested relationships and partial off-screen steps', () => {
    expect(projectStep(workflow.steps[1], model, 'cloud')).toMatchObject({
      status: 'visible',
      from: 'services',
      to: 'assets',
      kind: 'data',
    })
    expect(projectStep(workflow.steps[2], model, 'assets')).toMatchObject({
      status: 'visible',
      from: 'uploads',
      to: 'processing',
      kind: 'event',
    })
    expect(projectStep(workflow.steps[3], model, 'assets')).toMatchObject({
      status: 'visible',
      from: 'processing',
      to: 'catalog',
      kind: 'data',
    })
    expect(projectStep(workflow.steps[0], model, 'cloud')).toEqual({
      status: 'outside',
      nodes: ['services'],
    })
  })
  it('never disguises invalid logical interactions as hidden internal steps', () => {
    expect(
      projectStep({ ...workflow.steps[2], kind: 'request' }, model).status,
    ).toBe('invalid')
    expect(
      projectStep({ ...workflow.steps[2], from: 'missing' }, model).status,
    ).toBe('invalid')
    const missingProjection = {
      ...model,
      project: () => ({ nodes: model.children(), edges: [] }),
    }
    expect(projectStep(workflow.steps[0], missingProjection).status).toBe(
      'invalid',
    )
  })
})
