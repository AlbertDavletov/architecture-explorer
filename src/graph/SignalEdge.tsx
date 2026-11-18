import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { Edge, EdgeProps } from '@xyflow/react'
import type { SignalKind } from '../model/architecture'
import type { Exposure } from './ComponentNode'

export type MapEdge = Edge<
  {
    kind: SignalKind
    backwards: boolean
    lane: number
    vertical: boolean
    scale: number
    exposure: Exposure
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
  const d = vertical
    ? `M ${sx} ${sy} C ${sx} ${my / 2}, ${mx + bend} ${my / 2}, ${mx + bend} ${my} S ${ex} ${(my + ey) / 2}, ${ex} ${ey}`
    : `M ${sx} ${sy} C ${mx / 2} ${sy}, ${mx / 2} ${my + bend}, ${mx} ${my + bend} S ${(mx + ex) / 2} ${ey}, ${ex} ${ey}`
  useLayoutEffect(() => {
    if (!dot.current || !path.current) return
    const duration = Math.max(1, (path.current.getTotalLength() / 42) * 1000)
    const phase = { request: 0.22, data: 0.61, event: 0.83 }[kind]
    // A common document clock preserves phase across unmounts and return visits.
    dot.current.style.animationDuration = duration + 'ms'
    dot.current.style.animationDelay =
      -((performance.now() + duration * phase) % duration) + 'ms'
  }, [d, kind])
  const style: CSSProperties = {
    offsetPath: `path('${d}')`,
    animationDirection: backwards ? 'reverse' : 'normal',
  }
  return (
    <g
      className={`signal ${kind} ${exposure}`}
      transform={`translate(${sourceX} ${sourceY}) scale(${scale})`}
      aria-hidden="true"
    >
      <path
        ref={path}
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        opacity=".53"
      />
      <g ref={dot} className="traveler" style={style}>
        <circle r="6.4" fill="currentColor" opacity=".12" />
        <circle r="3.6" fill="currentColor" stroke="white" strokeWidth=".8" />
      </g>
    </g>
  )
}
