import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { Edge, EdgeProps } from '@xyflow/react'
import type { SignalKind } from '../model/architecture'
import type { Exposure } from './ComponentNode'
import type { Emphasis, WorkflowSignal } from '../workflows/overlay'

export type MapEdge = Edge<
  {
    kind: SignalKind
    backwards: boolean
    lane: number
    vertical: boolean
    scale: number
    exposure: Exposure
    route?: number[][]
    origin: { x: number; y: number }
    emphasis?: Emphasis
    signal?: WorkflowSignal
  },
  'signal'
>

export function SignalEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<MapEdge>) {
  const path = useRef<SVGPathElement>(null)
  const dot = useRef<SVGGElement>(null)
  const { kind, backwards, lane, vertical, scale, exposure } = data!
  const signal = data!.signal
  // Draw in sibling-local units, so nested signals keep the same apparent pace.
  const dx = (targetX - sourceX) / scale,
    dy = (targetY - sourceY) / scale
  const offset = lane * 14,
    bend = lane * 11
  const sx = vertical ? offset : 0,
    sy = vertical ? 0 : offset
  const ex = dx + sx,
    ey = dy + sy
  const mx = (sx + ex) / 2,
    my = (sy + ey) / 2
  const curve = vertical
    ? `M ${sx} ${sy} C ${sx} ${my / 2}, ${mx + bend} ${my / 2}, ${mx + bend} ${my} S ${ex} ${(my + ey) / 2}, ${ex} ${ey}`
    : `M ${sx} ${sy} C ${mx / 2} ${sy}, ${mx / 2} ${my + bend}, ${mx} ${my + bend} S ${(mx + ex) / 2} ${ey}, ${ex} ${ey}`
  const d =
    data!.route?.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ') ??
    curve
  const origin = data!.route ? data!.origin : { x: sourceX, y: sourceY }
  useLayoutEffect(() => {
    if (!dot.current || !path.current) return
    const duration = Math.max(1, (path.current.getTotalLength() / 42) * 1000)
    dot.current.style.animationDuration = duration + 'ms'
    signal?.measure(duration)
  }, [d, signal?.token, signal?.measure])
  const style: CSSProperties = {
    offsetPath: `path('${d}')`,
    animationDirection: backwards ? 'reverse' : 'normal',
  }
  return (
    <g
      className={`signal ${kind} ${exposure} ${data!.emphasis ?? ''}`}
      transform={`translate(${origin.x} ${origin.y}) scale(${scale})`}
      aria-hidden="true"
    >
      <g className="signal-visual">
        <path
          ref={path}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinejoin="round"
          opacity=".53"
        />
        {signal && (
          <g
            key={signal.token}
            ref={dot}
            className={`traveler${signal.reduced ? ' reduced' : ''}`}
            style={style}
            onAnimationEnd={signal.finish}
          >
            <circle r="6.4" fill="currentColor" opacity=".12" />
            <circle
              r="3.6"
              fill="currentColor"
              stroke="white"
              strokeWidth=".8"
            />
          </g>
        )}
        <path
          className="signal-direction"
          d={backwards ? 'M 3 -3 L -2 0 L 3 3' : 'M -3 -3 L 2 0 L -3 3'}
          style={{
            offsetPath: `path('${d}')`,
            offsetDistance: '70%',
            offsetRotate: 'auto',
          }}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          opacity=".7"
        />
      </g>
    </g>
  )
}
