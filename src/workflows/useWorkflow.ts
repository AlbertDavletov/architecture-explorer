import { useCallback, useEffect, useRef, useState } from 'react'
import type { ArchitectureModel, Workflow } from './model'
import { projectStep, stepContext } from './projection'

export type WorkflowStatus =
  | 'closed'
  | 'preview'
  | 'navigating'
  | 'focusing'
  | 'animating'
  | 'waiting'
  | 'completed'
  | 'error'
export interface WorkflowNavigation {
  parent?: string
  navigating: boolean
  select?: (id?: string) => void
  goTo: (
    parent?: string,
    signal?: AbortSignal,
    focusIds?: string[],
  ) => Promise<boolean>
}
interface State {
  status: WorkflowStatus
  index: number
  run: number
  completedCount: number
  target?: string
  focusIds?: string[]
  error?: string
  arrival?: { component: string; parent?: string }
}
export const FOCUS_DWELL = 180
export const STATIC_DWELL = 600
export const ARRIVAL_HOLD = 420
const active = (s: WorkflowStatus) =>
  ['navigating', 'focusing', 'animating'].includes(s)

export function useWorkflow(
  workflow: Workflow | undefined,
  model: ArchitectureModel,
  navigation: WorkflowNavigation,
  reduced: boolean,
) {
  const [state, setState] = useState<State>({
    status: 'closed',
    index: 0,
    run: 0,
    completedCount: 0,
  })
  // Synchronous logical state guards duplicate clicks and stale async callbacks.
  const live = useRef(state)
  const nav = useRef(navigation)
  nav.current = navigation
  const controller = useRef<AbortController | undefined>(undefined)
  const [measurement, setMeasurement] = useState<{
    run: number
    duration: number
  }>()
  const publish = useCallback((next: State) => {
    live.current = next
    setState(next)
  }, [])

  const begin = (index: number) => {
    const previous = live.current
    if (!workflow || active(previous.status) || nav.current.navigating) return
    const step = workflow.steps[index]
    if (!step) return
    const here = projectStep(step, model, nav.current.parent)
    const destination = stepContext(step, model)
    if (here.status === 'invalid' || destination.status === 'unavailable') {
      publish({
        ...previous,
        status: 'error',
        error:
          here.status === 'invalid'
            ? here.error
            : destination.status === 'unavailable'
              ? destination.error
              : undefined,
      })
      return
    }
    // Keep a clearly visible interaction in place; otherwise use the deepest
    // valid context. Geometry and logical endpoints remain separate.
    nav.current.select?.()
    publish({
      status: 'navigating',
      index,
      run: previous.run + 1,
      completedCount: index === 0 ? 0 : previous.completedCount,
      target:
        here.status === 'visible' ? nav.current.parent : destination.parent,
      focusIds:
        here.status === 'visible' ? here.nodes : destination.projection.nodes,
    })
  }

  useEffect(() => {
    if (state.status !== 'navigating') return
    const abort = new AbortController()
    controller.current = abort
    let focusTimer: number | undefined
    const isCurrent = () =>
      !abort.signal.aborted && live.current.run === state.run
    void (async () => {
      try {
        const arrived = await nav.current.goTo(
          state.target,
          abort.signal,
          state.focusIds,
        )
        if (!isCurrent()) return
        if (!arrived) {
          publish({
            ...live.current,
            status: 'error',
            error: 'Unable to reach this interaction.',
          })
          return
        }
        publish({ ...live.current, status: 'focusing' })
        focusTimer = window.setTimeout(
          () => {
            if (isCurrent()) publish({ ...live.current, status: 'animating' })
          },
          reduced ? 0 : FOCUS_DWELL,
        )
      } catch {
        if (isCurrent())
          publish({
            ...live.current,
            status: 'error',
            error: 'Unable to reach this interaction.',
          })
      }
    })()
    return () => {
      abort.abort()
      clearTimeout(focusTimer)
      if (controller.current === abort) controller.current = undefined
    }
    // One orchestration per user action; phase changes must not cancel its trip.
  }, [state.run, publish])

  const finish = useCallback(() => {
    const s = live.current
    if (s.run !== state.run || s.status !== 'animating') return
    const projection = workflow
      ? projectStep(workflow.steps[s.index], model, nav.current.parent)
      : undefined
    const destination =
      projection?.status === 'visible'
        ? projection.to
        : projection?.status === 'internal'
          ? projection.component
          : undefined
    publish({
      ...s,
      arrival: destination
        ? { component: destination, parent: nav.current.parent }
        : undefined,
      completedCount: s.index + 1,
      status: s.index + 1 === workflow?.steps.length ? 'completed' : 'waiting',
    })
  }, [state.run, workflow, model, publish])

  useEffect(() => {
    const arrival = state.arrival
    if (!arrival) return
    const clear = () => {
      if (live.current.arrival === arrival)
        publish({ ...live.current, arrival: undefined })
    }
    if (navigation.navigating || navigation.parent !== arrival.parent) {
      clear()
      return
    }
    const timer = window.setTimeout(clear, ARRIVAL_HOLD)
    return () => clearTimeout(timer)
  }, [state.arrival, navigation.navigating, navigation.parent, publish])
  const measure = useCallback(
    (duration: number) => {
      if (
        live.current.run !== state.run ||
        live.current.status !== 'animating' ||
        !Number.isFinite(duration) ||
        duration <= 0
      )
        return
      setMeasurement((previous) =>
        previous?.run === state.run && previous.duration === duration
          ? previous
          : { run: state.run, duration },
      )
    },
    [state.run],
  )
  const current = workflow
    ? projectStep(workflow.steps[state.index], model, navigation.parent)
    : undefined
  useEffect(() => {
    if (state.status !== 'animating') return
    // CSS animation completion is primary. A measured-duration fallback covers
    // missing browser events; internal/reduced-motion steps have a static dwell.
    const duration =
      reduced || current?.status !== 'visible'
        ? STATIC_DWELL
        : measurement?.run === state.run
          ? measurement.duration + 100
          : undefined
    if (duration === undefined) return
    const timer = window.setTimeout(finish, duration)
    return () => clearTimeout(timer)
  }, [state.status, state.run, current?.status, measurement, reduced, finish])

  const open = () => {
    if (live.current.status === 'closed')
      publish({
        status: 'preview',
        index: 0,
        run: live.current.run + 1,
        completedCount: 0,
      })
  }
  const start = () => {
    if (
      live.current.status === 'preview' ||
      live.current.status === 'completed'
    )
      begin(0)
  }
  const next = () => {
    if (live.current.status === 'waiting') begin(live.current.index + 1)
  }
  const close = () => {
    controller.current?.abort()
    publish({
      status: 'closed',
      index: 0,
      run: live.current.run + 1,
      completedCount: 0,
    })
  }
  return {
    ...state,
    current,
    token: `${state.run}/${state.index}`,
    reduced,
    busy: active(state.status),
    highlighted: !!workflow && state.status !== 'closed',
    measure,
    finish,
    open,
    start,
    next,
    close,
  }
}
export type WorkflowPlayback = ReturnType<typeof useWorkflow>
