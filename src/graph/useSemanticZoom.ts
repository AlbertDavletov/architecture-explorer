import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { flushSync } from 'react-dom'
import { useReactFlow, type Viewport } from '@xyflow/react'
import { children, components } from '../model/architecture'
import { framing, reframe, type Size, type World } from './layout'

interface Frame {
  parent?: string
  view: Viewport
}
export interface Journey {
  outer?: string
  inner: string
  entering: boolean
}
interface Trip {
  from: Frame
  to: Frame
  steps: Journey[]
  start: number
  duration: number
}

const GESTURE_GAP = 190
const HINT_KEY = 'architecture-explorer.explored'
const mix = (a: number, b: number, t: number) => a + (b - a) * t

export function useSemanticZoom(
  world: World,
  size: Size,
  reduced: boolean,
  canvas: RefObject<HTMLDivElement | null>,
) {
  const flow = useReactFlow()
  const [parent, setParent] = useState<string>()
  const [selected, setSelected] = useState<string>()
  const [trip, setTrip] = useState<Trip>()
  const [stepIndex, setStepIndex] = useState(0)
  const [explored, setExplored] = useState(() => {
    try {
      return sessionStorage.getItem(HINT_KEY) === '1'
    } catch {
      return false
    }
  })
  const history = useRef<Frame[]>([])
  const locked = useRef(false)
  const restoreFocus = useRef(false)
  const quietUntil = useRef(0)
  const previous = useRef({ world, size })
  const selectionZoom = useRef(1)
  const intent = useRef(1)
  const bounds = framing(world, size, parent)

  const select = useCallback(
    (id?: string) => {
      if (locked.current) return
      setSelected(id)
      selectionZoom.current = flow.getZoom()
      intent.current = 1
    },
    [flow],
  )

  const travel = useCallback(
    (steps: Journey[], to: Frame) => {
      locked.current = true
      restoreFocus.current = !!canvas.current?.querySelector(':focus-visible')
      setStepIndex(0)
      setTrip({
        steps,
        from: { parent, view: flow.getViewport() },
        to,
        start: performance.now(),
        duration: steps.length > 1 ? 690 : steps.length ? 570 : 320,
      })
    },
    [canvas, flow, parent],
  )

  const enter = useCallback(
    (id: string, restore?: Viewport) => {
      if (
        locked.current ||
        id !== selected ||
        components.get(id)?.parent !== parent ||
        !children(id).length
      )
        return
      history.current.push({ parent, view: restore ?? flow.getViewport() })
      travel([{ inner: id, outer: parent, entering: true }], {
        parent: id,
        view: framing(world, size, id).home,
      })
    },
    [selected, parent, flow, world, size, travel],
  )

  const back = useCallback(
    (target?: string) => {
      if (locked.current) return
      if (!parent && !target) {
        travel([], { view: framing(world, size).home })
        return
      }
      const index = history.current.findIndex(
        (saved) => saved.parent === target,
      )
      if (index < 0 || !parent) return
      const frames = history.current.splice(index).reverse()
      const steps = frames.map((frame, i) => ({
        inner: i === 0 ? parent : frames[i - 1].parent!,
        outer: frame.parent,
        entering: false,
      }))
      travel(steps, frames[frames.length - 1])
    },
    [parent, travel, world, size],
  )

  useLayoutEffect(() => {
    if (trip || !restoreFocus.current) return
    const raf = requestAnimationFrame(() => {
      const el = canvas.current
      const card =
        el?.querySelector<HTMLButtonElement>(
          '.node-card[aria-pressed="true"]:enabled',
        ) ?? el?.querySelector<HTMLButtonElement>('.node-card:enabled')
      card?.focus({ preventScroll: true })
      restoreFocus.current = false
    })
    return () => cancelAnimationFrame(raf)
  }, [trip, canvas])

  // One clock controls the camera across the entire route. Only the adjacent
  // pair of graph projections changes as the camera crosses each boundary.
  useLayoutEffect(() => {
    if (!trip || !canvas.current) return
    const el = canvas.current
    const { from, to, steps, start, duration } = trip
    let shownIndex = -1
    let location = from.parent
    let raf = 0
    function tick(now: number, beforePaint = false) {
      const t = reduced ? 1 : Math.min(1, Math.max(0, (now - start) / duration))
      const eased = t * t * (3 - 2 * t)
      const a = from.view,
        b = to.view
      const zoom = a.zoom * Math.pow(b.zoom / a.zoom, eased)
      const pan =
        Math.abs(b.zoom - a.zoom) < 1e-8
          ? eased
          : (zoom - a.zoom) / (b.zoom - a.zoom)
      void flow.setViewport(
        t === 1 ? b : { zoom, x: mix(a.x, b.x, pan), y: mix(a.y, b.y, pan) },
      )
      if (steps.length) {
        const along = eased * steps.length
        const i = Math.min(steps.length - 1, Math.floor(along))
        const step = steps[i]
        const open = step.entering ? along - i : 1 - (along - i)
        const visible = open >= 0.52 ? step.inner : step.outer
        if (i !== shownIndex || visible !== location) {
          // Commit the new shells before applying their opacity for this frame.
          const sync = () => {
            setStepIndex(i)
            setParent(visible)
          }
          if (beforePaint) sync()
          else flushSync(sync)
          shownIndex = i
          location = visible
        }
        el.style.setProperty('--open', String(open))
        el.style.setProperty('--outside', String(Math.max(0, 1 - open / 0.65)))
        el.style.setProperty(
          '--inside',
          String(Math.min(1, Math.max(0, (open - 0.52) / 0.43))),
        )
      }
      if (t < 1) {
        raf = requestAnimationFrame((now) => tick(now))
        return
      }
      const last = steps.at(-1)
      if (last?.entering) {
        setExplored(true)
        try {
          sessionStorage.setItem(HINT_KEY, '1')
        } catch {
          /* Keep the in-memory hint state. */
        }
      }
      setParent(to.parent)
      setSelected(last?.inner)
      selectionZoom.current = to.view.zoom
      intent.current = 1
      locked.current = false
      quietUntil.current = performance.now() + GESTURE_GAP
      setTrip(undefined)
    }
    tick(performance.now(), true)
    return () => cancelAnimationFrame(raf)
  }, [trip, reduced, flow, canvas])

  useLayoutEffect(() => {
    const prior = previous.current
    if (prior.size.width === size.width && prior.size.height === size.height)
      return
    previous.current = { world, size }
    const convert = (f: Frame): Frame => ({
      parent: f.parent,
      view: reframe(
        f.view,
        framing(prior.world, prior.size, f.parent),
        framing(world, size, f.parent),
        prior.size,
        size,
      ),
    })
    history.current = history.current.map(convert)
    if (trip)
      setTrip({ ...trip, from: convert(trip.from), to: convert(trip.to) })
    else {
      const next = convert({ parent, view: flow.getViewport() }).view
      void flow.setViewport(next)
      selectionZoom.current = next.zoom
      intent.current = 1
    }
  }, [world, size, parent, trip, flow])

  // Keep navigation intent separate from camera scale: a selected card at
  // maximum magnification still responds to a deliberate inward gesture.
  const lastWheel = useRef(-Infinity)
  const beforeGesture = useRef<Viewport | undefined>(undefined)
  useEffect(() => {
    const element = canvas.current!
    const consume = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
    }
    const blocked = () => {
      if (!locked.current && performance.now() >= quietUntil.current)
        return false
      quietUntil.current = performance.now() + GESTURE_GAP
      return true
    }
    function navigate(factor: number) {
      const ratio = intent.current * factor
      if (
        factor > 1 &&
        selected &&
        children(selected).length &&
        selected !== parent &&
        ratio >= 1.43
      ) {
        enter(selected, beforeGesture.current)
        return true
      }
      if (
        factor < 1 &&
        parent &&
        ratio <= 0.72 &&
        flow.getZoom() * factor <= bounds.minZoom
      ) {
        back(components.get(parent)?.parent)
        return true
      }
      intent.current = Math.max(
        Math.min(0.72, bounds.minZoom / selectionZoom.current),
        Math.min(Math.max(1.43, bounds.maxZoom / selectionZoom.current), ratio),
      )
      return false
    }
    function wheel(e: WheelEvent) {
      if (!(e.target instanceof Element) || !e.target.closest('.react-flow'))
        return
      const now = performance.now()
      if (now - lastWheel.current > GESTURE_GAP)
        beforeGesture.current = flow.getViewport()
      lastWheel.current = now
      const unit = e.deltaMode === 1 ? 0.05 : e.deltaMode === 2 ? 1 : 0.002
      const pinch = e.ctrlKey && /Mac/.test(navigator.platform) ? 10 : 1
      if (blocked() || navigate(2 ** (-e.deltaY * unit * pinch))) consume(e)
    }
    let distance = 0
    const span = (e: TouchEvent) =>
      e.touches.length === 2
        ? Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
          )
        : 0
    function touchStart(e: TouchEvent) {
      distance = span(e)
      beforeGesture.current = flow.getViewport()
    }
    function touchMove(e: TouchEvent) {
      const next = span(e)
      if (next && distance && (blocked() || navigate(next / distance)))
        consume(e)
      distance = next
    }
    const opts = { capture: true, passive: false }
    element.addEventListener('wheel', wheel, opts)
    element.addEventListener('touchstart', touchStart, opts)
    element.addEventListener('touchmove', touchMove, opts)
    return () => {
      element.removeEventListener('wheel', wheel, true)
      element.removeEventListener('touchstart', touchStart, true)
      element.removeEventListener('touchmove', touchMove, true)
    }
  }, [
    selected,
    parent,
    bounds.minZoom,
    bounds.maxZoom,
    enter,
    back,
    canvas,
    flow,
  ])

  return {
    ...bounds,
    parent,
    selected,
    select,
    explored,
    enter,
    back,
    journey: trip?.steps[stepIndex],
    navigating: !!trip,
  }
}
