import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { architecture, createArchitecture } from '../model/architecture'
import raw from './upload-image.json'
import { parseWorkflow } from './model'
import { projectStep, projectParticipation } from './projection'
import {
  FOCUS_DWELL,
  STATIC_DWELL,
  useWorkflow,
  type WorkflowNavigation,
} from './useWorkflow'
import { workflowOverlay } from './overlay'
import { scene } from '../graph/scene'
import { buildWorld } from '../graph/layout'

const workflow = parseWorkflow(raw, architecture)
beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
function setup(parent?: string, reduced = false) {
  let settle: (success: boolean) => void = () => {}
  let signal: AbortSignal | undefined
  const nav: WorkflowNavigation = {
    parent,
    navigating: false,
    goTo: vi.fn((_parent, abort) => {
      signal = abort
      if (_parent === nav.parent) return Promise.resolve(true)
      return new Promise<boolean>((resolve) => {
        settle = resolve
        abort?.addEventListener('abort', () => resolve(false), { once: true })
      })
    }),
  }
  const h = renderHook(
    ({ navigation, reduced }) =>
      useWorkflow(workflow, architecture, navigation, reduced),
    { initialProps: { navigation: nav, reduced } },
  )
  const open = () => act(() => h.result.current.open())
  const start = () => act(() => h.result.current.start())
  const focus = async () =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(FOCUS_DWELL)
    })
  const arrive = async (parent?: string) => {
    nav.parent = parent
    h.rerender({ navigation: { ...nav, parent, navigating: false }, reduced })
    await act(async () => {
      settle(true)
    })
    await focus()
  }
  const complete = () => act(() => h.result.current.finish())
  return {
    ...h,
    nav,
    open,
    start,
    focus,
    arrive,
    complete,
    signal: () => signal,
  }
}

it('previews only and runs one first step without automatic progression', async () => {
  const h = setup()
  h.open()
  expect(h.result.current.status).toBe('preview')
  expect(h.result.current.highlighted).toBe(true)
  act(() => vi.advanceTimersByTime(60000))
  expect(h.result.current.status).toBe('preview')
  h.start()
  expect(h.nav.goTo).toHaveBeenCalledWith(undefined, expect.any(AbortSignal), [
    'clients',
    'cloud',
  ])
  await act(async () => {
    await Promise.resolve()
  })
  expect(h.result.current.status).toBe('focusing')
  await h.focus()
  expect(h.result.current.status).toBe('animating')
  act(() => h.result.current.measure(1000))
  act(() => vi.advanceTimersByTime(999))
  expect(h.result.current.completedCount).toBe(0)
  h.complete()
  expect(h.result.current.status).toBe('waiting')
  act(() => vi.advanceTimersByTime(60000))
  expect(h.result.current.index).toBe(0)
  expect(h.result.current.completedCount).toBe(1)
})

it('navigates then focuses before one signal; repeated clicks cannot skip steps', async () => {
  const h = setup('web')
  h.open()
  h.start()
  expect(h.result.current.status).toBe('navigating')
  expect(h.nav.goTo).toHaveBeenCalledWith(
    undefined,
    expect.any(AbortSignal),
    expect.any(Array),
  )
  act(() => {
    h.result.current.start()
    h.result.current.next()
    h.result.current.finish()
  })
  expect(h.result.current.index).toBe(0)
  expect(h.result.current.completedCount).toBe(0)
  await h.arrive()
  expect(h.result.current.status).toBe('animating')
  const staleFinish = h.result.current.finish
  h.complete()
  act(() => {
    h.result.current.next()
    h.result.current.next()
    h.result.current.next()
  })
  expect(h.result.current.index).toBe(1)
  expect(h.result.current.status).toBe('navigating')
  expect(h.nav.goTo).toHaveBeenLastCalledWith(
    'cloud',
    expect.any(AbortSignal),
    expect.any(Array),
  )
  act(() => staleFinish())
  expect(h.result.current.completedCount).toBe(1)
  await h.arrive('cloud')
  h.complete()
  expect(h.result.current.status).toBe('waiting')
  expect(h.result.current.completedCount).toBe(2)
})

it('manual exploration while waiting preserves progress; Next targets the next interaction', async () => {
  const h = setup()
  h.open()
  h.start()
  await h.focus()
  h.complete()
  h.rerender({
    navigation: { ...h.nav, parent: 'editor', navigating: true },
    reduced: false,
  })
  act(() => h.result.current.next())
  expect(h.result.current.index).toBe(0)
  h.rerender({
    navigation: { ...h.nav, parent: 'editor', navigating: false },
    reduced: false,
  })
  act(() => vi.advanceTimersByTime(60000))
  expect(h.result.current.status).toBe('waiting')
  act(() => h.result.current.next())
  expect(h.result.current.index).toBe(1)
  expect(h.nav.goTo).toHaveBeenLastCalledWith(
    'cloud',
    expect.any(AbortSignal),
    expect.any(Array),
  )
})

it.each(['navigating', 'focusing', 'animating'] as const)(
  'close during %s cancels without stale completion',
  async (phase) => {
    const h = setup(phase === 'navigating' ? 'web' : undefined)
    h.open()
    h.start()
    if (phase === 'animating') await h.focus()
    const stale = h.result.current.finish
    if (phase === 'animating') act(() => h.result.current.measure(5000))
    act(() => h.result.current.close())
    if (phase === 'navigating') {
      expect(h.signal()?.aborted).toBe(true)
      await h.arrive()
    }
    act(() => {
      stale()
      vi.advanceTimersByTime(60000)
    })
    expect(h.result.current.status).toBe('closed')
    expect(h.result.current.highlighted).toBe(false)
    expect(h.result.current.completedCount).toBe(0)
  },
)

it('finishes, holds completion indefinitely and replays from step one', async () => {
  const h = setup()
  h.open()
  h.start()
  await h.focus()
  h.complete()
  for (const parent of ['cloud', 'assets', 'assets', undefined]) {
    act(() => h.result.current.next())
    if (h.result.current.status === 'navigating') await h.arrive(parent)
    else await h.focus()
    h.complete()
  }
  expect(h.result.current.status).toBe('completed')
  expect(h.result.current.completedCount).toBe(5)
  act(() => vi.advanceTimersByTime(60000))
  expect(h.result.current.highlighted).toBe(true)
  act(() => h.result.current.start())
  expect(h.result.current.index).toBe(0)
  expect(h.result.current.completedCount).toBe(0)
  await h.focus()
  h.complete()
  expect(h.result.current.status).toBe('waiting')
})

it('reduced motion uses a finite static action and still waits for Next', async () => {
  const h = setup(undefined, true)
  h.open()
  h.start()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
  expect(h.result.current.status).toBe('animating')
  act(() => vi.advanceTimersByTime(STATIC_DWELL))
  expect(h.result.current.status).toBe('waiting')
  expect(h.result.current.index).toBe(0)
})

it('handles a missing animation event and cancels navigation on unmount', async () => {
  const h = setup()
  h.open()
  h.start()
  await h.focus()
  act(() => h.result.current.measure(1000))
  act(() => vi.advanceTimersByTime(1100))
  expect(h.result.current.status).toBe('waiting')
  act(() => h.result.current.next())
  h.unmount()
  expect(h.signal()?.aborted).toBe(true)
})

it('surfaces invalid relationships instead of starting misleading navigation', () => {
  const invalid = {
    ...workflow,
    steps: [{ ...workflow.steps[0], to: 'unknown' }],
  }
  const goTo = vi.fn(async () => true)
  const h = renderHook(() =>
    useWorkflow(invalid, architecture, { navigating: false, goTo }, false),
  )
  act(() => h.result.current.open())
  act(() => h.result.current.start())
  expect(h.result.current.status).toBe('error')
  expect(h.result.current.error).toMatch(/unknown/)
  expect(goTo).not.toHaveBeenCalled()
})

it('completes internal actions with a static highlight instead of inventing an edge', async () => {
  const step = {
    id: 'internal',
    from: 'assets',
    to: 'uploads',
    kind: 'data' as const,
  }
  const model = createArchitecture({
    components: [...architecture.components.values()],
    relationships: [step],
  })
  const internal = { ...workflow, steps: [step] }
  const goTo = vi.fn(async () => true)
  const h = renderHook(() =>
    useWorkflow(
      internal,
      model,
      { parent: 'cloud', navigating: false, goTo },
      false,
    ),
  )
  act(() => h.result.current.open())
  act(() => h.result.current.start())
  await act(async () => {
    await vi.advanceTimersByTimeAsync(FOCUS_DWELL)
  })
  expect(h.result.current.current?.status).toBe('internal')
  expect(h.result.current.status).toBe('animating')
  const graph = scene(
    buildWorld(false),
    'cloud',
    undefined,
    undefined,
    true,
    vi.fn(),
    vi.fn(),
  )
  const shown = workflowOverlay(
    graph,
    [h.result.current.current!],
    h.result.current,
    false,
  )
  expect(shown.edges.some((e) => e.data?.signal)).toBe(false)
  expect(shown.nodes.find((n) => n.id === 'assets')?.data.emphasis).toBe(
    'current',
  )
  act(() => vi.advanceTimersByTime(STATIC_DWELL))
  expect(h.result.current.status).toBe('completed')
})

it('keeps lens geometry/navigation intact and separates active, completed and unrelated emphasis', async () => {
  const h = setup('assets')
  const graph = scene(
    buildWorld(false),
    'assets',
    undefined,
    'search',
    true,
    vi.fn(),
    vi.fn(),
  )
  const projected = workflow.steps.map((s) =>
    projectStep(s, architecture, 'assets'),
  )
  const participation = projectParticipation(workflow, architecture, 'assets')
  h.open()
  let shown = workflowOverlay(
    graph,
    projected,
    h.result.current,
    false,
    participation,
  )
  expect(shown.edges.some((e) => e.data?.signal)).toBe(false)
  const search = shown.nodes.find((n) => n.id === 'search')!
  expect(search.data).toMatchObject({
    emphasis: 'dimmed',
    interactive: true,
    selected: true,
  })
  expect(search.data.enter).toBe(
    graph.nodes.find((n) => n.id === 'search')!.data.enter,
  )
  const mock = {
    ...h.result.current,
    status: 'animating' as const,
    index: 2,
    completedCount: 2,
    current: projected[2],
  }
  shown = workflowOverlay(graph, projected, mock, false, participation)
  expect(shown.edges.filter((e) => e.data?.signal).map((e) => e.id)).toEqual([
    'uploads/event/processing',
  ])
  shown = workflowOverlay(
    graph,
    projected,
    { ...mock, status: 'waiting', completedCount: 3 },
    false,
    participation,
  )
  expect(shown.edges.some((e) => e.data?.signal)).toBe(false)
  expect(
    shown.edges.find((e) => e.id === 'uploads/event/processing')?.data
      ?.emphasis,
  ).toBe('done')
  shown.nodes.forEach((n, i) =>
    expect(n.position).toEqual(graph.nodes[i].position),
  )
})
