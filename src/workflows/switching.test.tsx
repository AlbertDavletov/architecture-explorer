import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { architecture } from '../model/architecture'
import { createWorkflowCatalog } from './catalog'
import {
  FOCUS_DWELL,
  useWorkflow,
  type WorkflowNavigation,
} from './useWorkflow'
import { workflowSignalDuration } from './signalDuration'

const workflows = createWorkflowCatalog(architecture)
beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function setup(index = 0) {
  const navigation: WorkflowNavigation = {
    parent: 'assets',
    navigating: false,
    goTo: vi.fn(async (parent) => {
      navigation.parent = parent
      return true
    }),
  }
  const h = renderHook(
    ({ workflow }) => useWorkflow(workflow, architecture, navigation, false),
    {
      initialProps: { workflow: workflows[index] },
    },
  )
  const choose = (index: number) =>
    act(() => {
      if (h.result.current.preview()) h.rerender({ workflow: workflows[index] })
    })
  const focus = () =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(FOCUS_DWELL)
    })
  return { ...h, navigation, choose, focus }
}

it.each(workflows.map((workflow, index) => ({ ...workflow, index })))(
  '$name shares Start/Next, adaptive completion, replay and close behavior',
  async (workflow) => {
    const h = setup(workflow.index)
    h.choose(workflow.index)
    expect(h.result.current.status).toBe('preview')
    expect(h.navigation.parent).toBe('assets')
    expect(h.navigation.goTo).not.toHaveBeenCalled()
    for (let i = 0; i < workflow.steps.length; i++) {
      act(() => {
        if (i === 0) h.result.current.start()
        else h.result.current.next()
        h.result.current.next() // Duplicate actions cannot skip steps.
      })
      await h.focus()
      expect(h.result.current.index).toBe(i)
      expect(h.result.current.status).toBe('animating')
      expect(h.result.current.current?.status).toBe('visible')
      const duration = workflowSignalDuration(150 + i * 80)
      act(() => h.result.current.measure(duration))
      act(() => vi.advanceTimersByTime(duration + 99))
      expect(h.result.current.status).toBe('animating')
      act(() => vi.advanceTimersByTime(1))
      expect(h.result.current.completedCount).toBe(i + 1)
      expect(h.result.current.status).toBe(
        i === workflow.steps.length - 1 ? 'completed' : 'waiting',
      )
      act(() => vi.advanceTimersByTime(60000))
      expect(h.result.current.index).toBe(i)
    }
    act(() => h.result.current.start())
    expect(h.result.current.index).toBe(0)
    expect(h.result.current.completedCount).toBe(0)
    await h.focus()
    const stale = h.result.current.finish
    act(() => h.result.current.close())
    act(() => {
      stale()
      vi.advanceTimersByTime(60000)
    })
    expect(h.result.current.status).toBe('closed')
    expect(h.result.current.highlighted).toBe(false)
  },
)

it('switches while waiting, clearing progress/arrival without navigating or accepting stale callbacks', async () => {
  const h = setup()
  h.choose(0)
  act(() => h.result.current.start())
  await h.focus()
  const oldFinish = h.result.current.finish
  const oldMeasure = h.result.current.measure
  act(() => h.result.current.measure(1800))
  act(() => h.result.current.finish())
  expect(h.result.current.arrival).toBeDefined()
  expect(h.result.current.status).toBe('waiting')
  const previousContext = h.navigation.parent
  vi.mocked(h.navigation.goTo).mockClear()
  h.choose(1)
  expect(h.navigation.parent).toBe(previousContext)
  expect(h.navigation.goTo).not.toHaveBeenCalled()
  expect(h.result.current).toMatchObject({
    status: 'preview',
    index: 0,
    completedCount: 0,
  })
  expect(h.result.current.arrival).toBeUndefined()
  act(() => {
    oldFinish()
    oldMeasure(1)
    vi.advanceTimersByTime(60000)
  })
  expect(h.result.current.status).toBe('preview')
  act(() => h.result.current.start())
  await h.focus()
  act(() => {
    oldFinish()
    oldMeasure(1)
    vi.advanceTimersByTime(60000)
  })
  expect(h.result.current.status).toBe('animating')
  expect(h.result.current.completedCount).toBe(0)
  act(() => h.result.current.finish())
  expect(h.result.current.status).toBe('waiting')
  expect(h.result.current.completedCount).toBe(1)
})

it('switches from completed to Preview without replaying or moving the reached context', async () => {
  const h = setup(1)
  h.choose(1)
  for (let i = 0; i < workflows[1].steps.length; i++) {
    act(() => (i === 0 ? h.result.current.start() : h.result.current.next()))
    await h.focus()
    act(() => h.result.current.finish())
  }
  expect(h.result.current.status).toBe('completed')
  expect(h.navigation.parent).toBe('editor')
  vi.mocked(h.navigation.goTo).mockClear()
  h.choose(2)
  expect(h.result.current).toMatchObject({
    status: 'preview',
    index: 0,
    completedCount: 0,
  })
  expect(h.navigation.parent).toBe('editor')
  expect(h.navigation.goTo).not.toHaveBeenCalled()
  expect(h.result.current.arrival).toBeUndefined()
})

it('guards selection during navigation, focus and signals, including manual navigation', async () => {
  const h = setup()
  h.choose(0)
  act(() => h.result.current.start())
  act(() => expect(h.result.current.preview()).toBe(false))
  await act(async () => {
    await Promise.resolve()
  })
  expect(h.result.current.status).toBe('focusing')
  h.choose(2)
  expect(h.result.current.status).toBe('focusing')
  await h.focus()
  h.choose(2)
  expect(h.result.current.status).toBe('animating')
  act(() => h.result.current.finish())
  h.navigation.navigating = true
  h.choose(2)
  expect(h.result.current.status).toBe('waiting')
  h.navigation.navigating = false
  h.choose(2)
  expect(h.result.current.status).toBe('preview')
})
