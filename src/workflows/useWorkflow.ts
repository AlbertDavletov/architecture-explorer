import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import type { ProjectedStep } from './projection'
import type { Workflow } from './model'

export type PlaybackStatus =
  | 'closed'
  | 'preview'
  | 'playing'
  | 'paused'
  | 'complete'
export const STEP_DWELL = 2200
export const COMPLETION_HOLD = 2600

export function useWorkflow(
  workflow: Workflow | undefined,
  projections: ProjectedStep[],
  context: string,
  navigating: boolean,
  reduced: boolean,
) {
  const [state, setState] = useState({
    status: 'closed' as PlaybackStatus,
    index: 0,
    run: 0,
    highlighted: false,
  })
  const [measurement, setMeasurement] = useState<{
    token: string
    duration: number
  }>()
  const token = `${state.run}/${state.index}`
  const current = projections[state.index]
  const visible = current?.status === 'visible'

  // Navigation never resets logical progress. Continue deliberately restarts
  // this interaction in its new representation; no automatic camera travel.
  useLayoutEffect(() => {
    setState((s) =>
      s.status === 'playing' ? { ...s, status: 'paused', run: s.run + 1 } : s,
    )
  }, [context, navigating])

  const measure = useCallback(
    (duration: number) => {
      setMeasurement((previous) =>
        previous?.token === token && previous.duration === duration
          ? previous
          : { token, duration },
      )
    },
    [token],
  )
  const duration =
    reduced || !visible
      ? STEP_DWELL
      : measurement?.token === token
        ? measurement.duration + 600
        : undefined

  useEffect(() => {
    if (state.status !== 'playing' || navigating || duration === undefined)
      return
    const timer = window.setTimeout(
      () =>
        setState((s) => {
          if (s.status !== 'playing' || `${s.run}/${s.index}` !== token)
            return s
          return s.index + 1 < (workflow?.steps.length ?? 0)
            ? { ...s, index: s.index + 1 }
            : { ...s, status: 'complete' }
        }),
      duration,
    )
    return () => clearTimeout(timer)
  }, [state.status, token, duration, navigating, workflow])

  useEffect(() => {
    if (state.status !== 'complete') return
    const timer = window.setTimeout(
      () => setState((s) => ({ ...s, highlighted: false })),
      COMPLETION_HOLD,
    )
    return () => clearTimeout(timer)
  }, [state.status])

  const open = () =>
    setState((s) => ({
      ...s,
      status: 'preview',
      index: 0,
      highlighted: !!workflow,
    }))
  const pause = () =>
    setState((s) =>
      s.status === 'playing' ? { ...s, status: 'paused', run: s.run + 1 } : s,
    )
  const start = () => {
    if (
      workflow &&
      !navigating &&
      !projections.some((p) => p.status === 'invalid')
    )
      setState((s) => ({
        status: 'playing',
        index: 0,
        run: s.run + 1,
        highlighted: true,
      }))
  }
  const resume = () => {
    if (!navigating)
      setState((s) =>
        s.status === 'paused' ? { ...s, status: 'playing', run: s.run + 1 } : s,
      )
  }
  const close = () =>
    setState((s) => ({
      ...s,
      status: 'closed',
      index: 0,
      run: s.run + 1,
      highlighted: false,
    }))
  return {
    ...state,
    token,
    current,
    reduced,
    measure,
    open,
    pause,
    start,
    resume,
    close,
  }
}
export type WorkflowPlayback = ReturnType<typeof useWorkflow>
