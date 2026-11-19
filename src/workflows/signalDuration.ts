export const MIN_WORKFLOW_SIGNAL_MS = 650
export const MAX_WORKFLOW_SIGNAL_MS = 1800

// Explanatory time, not system latency or a traffic-rate calculation.
// Logarithmic growth keeps distinct path lengths readable without long waits.
export function workflowSignalDuration(length: number): number {
  if (!Number.isFinite(length) || length < 0) return MIN_WORKFLOW_SIGNAL_MS
  return Math.round(
    Math.min(
      MAX_WORKFLOW_SIGNAL_MS,
      Math.max(MIN_WORKFLOW_SIGNAL_MS, 450 + 450 * Math.log1p(length / 80)),
    ),
  )
}
