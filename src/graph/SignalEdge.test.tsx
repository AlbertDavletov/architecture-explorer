import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { EdgeProps } from '@xyflow/react'
import { SignalEdge, type MapEdge } from './SignalEdge'

afterEach(cleanup)
const props = {
  id: 'test',
  sourceX: 0,
  sourceY: 0,
  targetX: 84,
  targetY: 0,
  data: {
    kind: 'data',
    backwards: true,
    lane: 0,
    vertical: false,
    scale: 1,
    exposure: 'steady',
    origin: { x: 0, y: 0 },
  },
} as EdgeProps<MapEdge>
it('renders static architecture with a directional arrow and no signal dot', () => {
  const h = render(
    <svg>
      <SignalEdge {...props} />
    </svg>,
  )
  expect(h.container.querySelector('.traveler')).toBeNull()
  expect(
    h.container.querySelector('.signal-direction')?.getAttribute('d'),
  ).toBe('M 3 -3 L -2 0 L 3 3')
})
it('measures a single workflow signal at fixed speed and preserves direction', () => {
  Object.defineProperty(SVGElement.prototype, 'getTotalLength', {
    configurable: true,
    value: () => 84,
  })
  const measure = vi.fn()
  const h = render(
    <svg>
      <SignalEdge
        {...props}
        data={{
          ...props.data!,
          signal: { token: '1/0', reduced: false, measure },
        }}
      />
    </svg>,
  )
  expect(measure).toHaveBeenCalledWith(2000)
  expect(h.container.querySelectorAll('.traveler')).toHaveLength(1)
  expect(
    (h.container.querySelector('.traveler') as SVGElement).style
      .animationDirection,
  ).toBe('reverse')
  h.rerender(
    <svg>
      <SignalEdge
        {...props}
        data={{
          ...props.data!,
          signal: { token: '1/0', reduced: true, measure },
        }}
      />
    </svg>,
  )
  expect(h.container.querySelector('.traveler.reduced')).not.toBeNull()
})
