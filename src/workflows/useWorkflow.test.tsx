import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { architecture } from '../model/architecture'
import raw from './upload-image.json'
import { parseWorkflow } from './model'
import { projectStep, projectParticipation } from './projection'
import { COMPLETION_HOLD, STEP_DWELL, useWorkflow } from './useWorkflow'
import { workflowOverlay } from './overlay'
import { scene } from '../graph/scene'
import { buildWorld } from '../graph/layout'

const workflow = parseWorkflow(raw, architecture)
const projections = workflow.steps.map((s) => projectStep(s, architecture))
beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
function setup() {
  return renderHook(
    ({ context, navigating, reduced }) =>
      useWorkflow(workflow, projections, context, navigating, reduced),
    { initialProps: { context: 'root', navigating: false, reduced: false } },
  )
}
it('starts, advances in order, completes once, clears highlighting and replays', () => {
  const h = setup()
  expect(h.result.current.status).toBe('closed')
  act(() => h.result.current.open())
  expect(h.result.current.status).toBe('preview')
  expect(h.result.current.highlighted).toBe(true)
  act(() => h.result.current.start())
  for (let i = 0; i < workflow.steps.length; i++) {
    expect(h.result.current.index).toBe(i)
    if (projections[i].status === 'visible')
      act(() => h.result.current.measure(1000))
    act(() =>
      vi.advanceTimersByTime(
        projections[i].status === 'visible' ? 1600 : STEP_DWELL,
      ),
    )
  }
  expect(h.result.current.status).toBe('complete')
  expect(h.result.current.highlighted).toBe(true)
  act(() => vi.advanceTimersByTime(COMPLETION_HOLD))
  expect(h.result.current.highlighted).toBe(false)
  act(() => vi.advanceTimersByTime(100000))
  expect(h.result.current.index).toBe(4)
  act(() => h.result.current.start())
  expect(h.result.current.status).toBe('playing')
  expect(h.result.current.index).toBe(0)
})
it('closing cancels active timers and removes the overlay', () => {
  const h = setup()
  act(() => h.result.current.start())
  act(() => h.result.current.measure(1000))
  act(() => h.result.current.close())
  act(() => vi.advanceTimersByTime(100000))
  expect(h.result.current.status).toBe('closed')
  expect(h.result.current.index).toBe(0)
  expect(h.result.current.highlighted).toBe(false)
})
it('pauses immediately on navigation, retains logical step and resumes deliberately', () => {
  const h = setup()
  act(() => h.result.current.start())
  act(() => h.result.current.measure(1000))
  act(() => vi.advanceTimersByTime(1600))
  expect(h.result.current.index).toBe(1)
  h.rerender({ context: 'root', navigating: true, reduced: false })
  expect(h.result.current.status).toBe('paused')
  h.rerender({ context: 'cloud', navigating: false, reduced: false })
  act(() => vi.advanceTimersByTime(100000))
  expect(h.result.current.index).toBe(1)
  act(() => h.result.current.resume())
  act(() => vi.advanceTimersByTime(STEP_DWELL))
  expect(h.result.current.index).toBe(2)
})
it('reduced motion runs a finite sequence without geometry or animation events', () => {
  const h = setup()
  h.rerender({ context: 'root', navigating: false, reduced: true })
  act(() => h.result.current.start())
  for (let i = 0; i < 5; i++) act(() => vi.advanceTimersByTime(STEP_DWELL))
  expect(h.result.current.status).toBe('complete')
})
it('overlays only relevant edges without changing layout, selection or navigation callbacks', () => {
  const graph = scene(
    buildWorld(false),
    undefined,
    undefined,
    'cloud',
    true,
    vi.fn(),
    vi.fn(),
  )
  const h = setup()
  expect(workflowOverlay(graph, projections, h.result.current, false)).toBe(
    graph,
  )
  act(() => h.result.current.start())
  const shown = workflowOverlay(graph, projections, h.result.current, false)
  expect(shown.edges.filter((e) => e.data?.signal).map((e) => e.id)).toEqual([
    'clients/request/cloud',
  ])
  expect(
    shown.edges.find((e) => e.id === 'cloud/event/clients')?.data?.emphasis,
  ).toBe('dimmed')
  shown.nodes.forEach((n, i) => {
    expect(n.position).toEqual(graph.nodes[i].position)
    expect(n.data.select).toBe(graph.nodes[i].data.select)
    expect(n.data.enter).toBe(graph.nodes[i].data.enter)
    expect(n.data.selected).toBe(graph.nodes[i].data.selected)
  })
  expect(workflowOverlay(graph, projections, h.result.current, true)).toBe(
    graph,
  )
})

it('previews participation without a current step or signal and keeps unrelated navigation intact', () => {
  const h = setup()
  const graph = scene(
    buildWorld(false),
    'cloud',
    undefined,
    'storage',
    true,
    vi.fn(),
    vi.fn(),
  )
  const lens = workflow.steps.map((s) => projectStep(s, architecture, 'cloud'))
  act(() => h.result.current.open())
  const shown = workflowOverlay(
    graph,
    lens,
    h.result.current,
    false,
    projectParticipation(workflow, architecture, 'cloud'),
  )
  expect(shown.nodes.filter((n) => n.data.emphasis === 'current')).toHaveLength(
    0,
  )
  expect(shown.edges.some((e) => e.data?.signal)).toBe(false)
  expect(shown.nodes.find((n) => n.id === 'assets')?.data.participation).toBe(
    'contains',
  )
  const storage = shown.nodes.find((n) => n.id === 'storage')!
  expect(storage.data).toMatchObject({
    emphasis: 'dimmed',
    participation: 'unrelated',
    interactive: true,
    selected: true,
  })
  expect(storage.data.enter).toBe(
    graph.nodes.find((n) => n.id === 'storage')!.data.enter,
  )
  act(() => h.result.current.close())
  expect(workflowOverlay(graph, lens, h.result.current, false)).toBe(graph)
})

it('explicit Follow pause invalidates the old timer without advancing the current step', () => {
  const h = setup()
  act(() => h.result.current.start())
  act(() => h.result.current.measure(1000))
  act(() => vi.advanceTimersByTime(800))
  act(() => h.result.current.pause())
  act(() => vi.advanceTimersByTime(5000))
  expect(h.result.current.status).toBe('paused')
  expect(h.result.current.index).toBe(0)
  act(() => h.result.current.resume())
  act(() => h.result.current.measure(1000))
  act(() => vi.advanceTimersByTime(1600))
  expect(h.result.current.index).toBe(1)
})
