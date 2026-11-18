import { useRef } from 'react'
import { components } from '../model/architecture'
import type { Workflow } from './model'
import type { WorkflowPlayback } from './useWorkflow'

export function WorkflowControl({
  workflow,
  error,
  playback: p,
  navigating,
  follow,
  location: context,
}: {
  workflow?: Workflow
  error?: string
  playback: WorkflowPlayback
  navigating: boolean
  follow?: () => void
  location?: string
}) {
  const trigger = useRef<HTMLButtonElement>(null)
  if (p.status === 'closed')
    return (
      <button ref={trigger} className="workflow-trigger" onClick={p.open}>
        Workflows
      </button>
    )
  const projection = p.current
  const location =
    projection?.status === 'internal'
      ? `Inside ${components.get(projection.component)?.name}`
      : projection?.status === 'outside'
        ? `In ${context ?? 'another area'}`
        : projection?.status === 'visible'
          ? `${components.get(projection.from)?.name} → ${components.get(projection.to)?.name}`
          : undefined
  return (
    <section className="workflow-control" aria-label="Guided workflow">
      <div className="workflow-heading">
        <strong>{workflow?.name ?? 'Workflows'}</strong>
        {!error && p.status !== 'playing' && (
          <button
            className="workflow-start"
            disabled={navigating}
            onClick={p.status === 'paused' ? p.resume : p.start}
          >
            {p.status === 'paused'
              ? 'Continue'
              : p.status === 'complete'
                ? 'Replay'
                : 'Start'}
          </button>
        )}
        <button
          aria-label="Close workflow"
          title="Close workflow"
          onClick={() => {
            p.close()
            requestAnimationFrame(() => trigger.current?.focus())
          }}
        >
          ×
        </button>
      </div>
      <small>Illustrative scenario · Not live traffic</small>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <>
          <div
            className="workflow-status"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {p.status === 'preview' ? (
              <p>
                Preview · Highlighted areas take part. Nested marks show
                activity inside.
              </p>
            ) : p.status === 'complete' ? (
              <p>Complete · Your image is ready.</p>
            ) : (
              <>
                <p>
                  <span className="step-count">
                    {p.index + 1} / {workflow?.steps.length}
                  </span>{' '}
                  {workflow?.steps[p.index].description ?? location}
                </p>
                <div className="workflow-location">
                  <small>
                    {p.status === 'paused' ? 'Paused · ' : ''}
                    {location}
                  </small>
                  {follow && (
                    <button
                      className="workflow-follow"
                      onClick={follow}
                      disabled={navigating}
                      title={`Follow to ${context}`}
                    >
                      Follow
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </section>
  )
}
