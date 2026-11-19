import { useEffect, useRef } from 'react'
import { components } from '../model/architecture'
import type { Workflow } from './model'
import type { WorkflowPlayback } from './useWorkflow'

export function WorkflowControl({
  workflows,
  workflow,
  open,
  onOpen,
  onChoose,
  onClose,
  error,
  playback: p,
  navigating,
}: {
  workflows: Workflow[]
  workflow?: Workflow
  open: boolean
  onOpen: () => void
  onChoose: (id: string) => void
  onClose: () => void
  error?: string
  playback: WorkflowPlayback
  navigating: boolean
}) {
  const trigger = useRef<HTMLButtonElement>(null)
  const selector = useRef<HTMLSelectElement>(null)
  useEffect(() => {
    if (open) selector.current?.focus()
  }, [open])
  const close = () => {
    onClose()
    requestAnimationFrame(() => trigger.current?.focus())
  }
  if (!open)
    return (
      <button ref={trigger} className="workflow-trigger" onClick={onOpen}>
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
      data-phase={workflow ? p.status : 'selecting'}
      aria-busy={p.busy}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          close()
        }
      }}
    >
      <div className="workflow-heading">
        <select
          ref={selector}
          className="workflow-select"
          aria-label="Workflow"
          value={workflow?.id ?? ''}
          disabled={p.busy || navigating || !workflows.length}
          onChange={(event) => onChoose(event.target.value)}
        >
          <option value="" disabled>
            Choose a workflow
          </option>
          {workflows.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        {workflow && !problem && (
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
          onClick={close}
        >
          ×
        </button>
      </div>
      {problem ? (
        <p role="alert">{problem}</p>
      ) : (
        workflow &&
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
