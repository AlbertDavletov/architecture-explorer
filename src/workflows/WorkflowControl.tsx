import { useRef } from 'react'
import { components } from '../model/architecture'
import type { Workflow } from './model'
import type { WorkflowPlayback } from './useWorkflow'

export function WorkflowControl({
  workflow,
  error,
  playback: p,
  navigating,
}: {
  workflow?: Workflow
  error?: string
  playback: WorkflowPlayback
  navigating: boolean
}) {
  const trigger = useRef<HTMLButtonElement>(null)
  if (p.status === 'closed')
    return (
      <button ref={trigger} className="workflow-trigger" onClick={p.open}>
        Workflows
      </button>
    )
  const problem = error ?? p.error
  const step = workflow?.steps[p.index]
  const label =
    p.status === 'preview'
      ? 'Start'
      : p.status === 'completed'
        ? 'Replay'
        : 'Next'
  return (
    <section
      className="workflow-control"
      aria-label="Guided workflow"
      data-phase={p.status}
      aria-busy={p.busy}
    >
      <div className="workflow-heading">
        <strong title={workflow?.description}>
          {workflow?.name ?? 'Workflows'}
        </strong>
        {!problem && (
          <button
            className="workflow-start"
            disabled={p.busy || navigating}
            onClick={p.status === 'waiting' ? p.next : p.start}
          >
            {label}
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
      {problem ? (
        <p role="alert">{problem}</p>
      ) : (
        p.status !== 'preview' && (
          <div
            className="workflow-status"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {p.status === 'completed' ? (
              <p>Completed</p>
            ) : (
              <p title={step?.description}>
                <span className="step-count">
                  {p.index + 1}/{workflow?.steps.length}
                </span>{' '}
                ·{' '}
                {step?.name ??
                  `${components.get(step?.from ?? '')?.name} → ${components.get(step?.to ?? '')?.name}`}
              </p>
            )}
          </div>
        )
      )}
    </section>
  )
}
