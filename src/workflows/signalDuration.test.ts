import { expect, it } from 'vitest'
import {
  workflowSignalDuration,
  MIN_WORKFLOW_SIGNAL_MS,
  MAX_WORKFLOW_SIGNAL_MS,
} from './signalDuration'

it('keeps short paths readable and long paths bounded', () => {
  for (const length of [0, 1, 10, 40])
    expect(workflowSignalDuration(length)).toBe(MIN_WORKFLOW_SIGNAL_MS)
  for (const length of [2000, 10000, Number.MAX_VALUE])
    expect(workflowSignalDuration(length)).toBe(MAX_WORKFLOW_SIGNAL_MS)
})
it('varies smoothly through intermediate lengths rather than using one fixed time', () => {
  const medium = [80, 160, 320, 640].map(workflowSignalDuration)
  expect(new Set(medium).size).toBe(4)
  medium.forEach((duration, i) => {
    expect(duration).toBeGreaterThan(MIN_WORKFLOW_SIGNAL_MS)
    expect(duration).toBeLessThan(MAX_WORKFLOW_SIGNAL_MS)
    if (i) expect(duration).toBeGreaterThan(medium[i - 1])
  })
  expect(
    workflowSignalDuration(321) - workflowSignalDuration(320),
  ).toBeLessThanOrEqual(2)
})
it.each([NaN, Infinity, -Infinity, -1, -100])(
  'safely handles invalid length %s',
  (length) => {
    expect(workflowSignalDuration(length)).toBe(MIN_WORKFLOW_SIGNAL_MS)
  },
)
it('always returns finite positive bounded durations', () => {
  for (let length = 0; length <= 10000; length += 13) {
    const duration = workflowSignalDuration(length)
    expect(Number.isFinite(duration)).toBe(true)
    expect(duration).toBeGreaterThanOrEqual(MIN_WORKFLOW_SIGNAL_MS)
    expect(duration).toBeLessThanOrEqual(MAX_WORKFLOW_SIGNAL_MS)
  }
})
