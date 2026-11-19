import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { components, type Component } from '../model/architecture'
import type { ComponentDetails, Resource, Description } from './model'

function Links({ items }: { items: Resource[] }) {
  return (
    <ul>
      {items.map((item, i) => (
        <li key={i}>
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  )
}
function Descriptions({ items }: { items: Description[] }) {
  return (
    <ul>
      {items.map((item, i) => (
        <li key={i}>
          <strong>{item.name}</strong>
          {item.description && <p>{item.description}</p>}
        </li>
      ))}
    </ul>
  )
}

export function ComponentInspector({
  component,
  details,
  trigger,
  onClose,
}: {
  component: Component
  details: ComponentDetails
  trigger: HTMLButtonElement
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const panel = dialog.current!
    panel.showModal()
    const position = () => {
      if (window.innerWidth <= 660) {
        panel.style.removeProperty('left')
        panel.style.removeProperty('top')
        return
      }
      const anchor = trigger
        .closest('.node-unit')
        ?.querySelector('.node-card')
        ?.getBoundingClientRect()
      const { width, height } = panel.getBoundingClientRect()
      const margin = 16,
        gap = 16
      let left = window.innerWidth - width - margin
      let top = margin
      if (anchor) {
        if (anchor.right + gap + width <= window.innerWidth - margin) {
          left = anchor.right + gap
          top = anchor.top
        } else if (anchor.left - gap - width >= margin) {
          left = anchor.left - gap - width
          top = anchor.top
        } else if (anchor.bottom + gap + height <= window.innerHeight - margin)
          top = anchor.bottom + gap
        else if (anchor.top - gap - height >= margin)
          top = anchor.top - gap - height
      }
      panel.style.left =
        Math.max(margin, Math.min(left, window.innerWidth - width - margin)) +
        'px'
      panel.style.top =
        Math.max(margin, Math.min(top, window.innerHeight - height - margin)) +
        'px'
    }
    position()
    const observer = new ResizeObserver(position)
    observer.observe(panel)
    window.addEventListener('resize', position)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', position)
      panel.close()
      if (trigger.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [trigger])
  return createPortal(
    <dialog
      ref={dialog}
      className="component-inspector"
      aria-labelledby="inspector-title"
      aria-modal="true"
      aria-describedby="inspector-summary"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }
      }}
      onClick={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <header className="inspector-heading">
        <h2 id="inspector-title">{component.name}</h2>
        <button
          type="button"
          aria-label="Close component details"
          autoFocus
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="inspector-content">
        <p id="inspector-summary">{details.summary ?? component.description}</p>
        {details.owner && (
          <p>
            <span className="inspector-label">Owner</span>
            {details.owner}
          </p>
        )}
        {details.source && (
          <div>
            <span className="inspector-label">Source code</span>
            <Links items={[details.source]} />
          </div>
        )}
        {!!details.documentation?.length && (
          <details>
            <summary>Documentation</summary>
            <Links items={details.documentation} />
          </details>
        )}
        {!!details.usedBy?.length && (
          <details>
            <summary>Used by</summary>
            <ul>
              {details.usedBy.map((id) => (
                <li key={id}>{components.get(id)!.name}</li>
              ))}
            </ul>
          </details>
        )}
        {!!details.featureFlags?.length && (
          <details>
            <summary>Feature flags</summary>
            <Descriptions items={details.featureFlags} />
          </details>
        )}
        {!!details.metrics?.length && (
          <details>
            <summary>Metrics</summary>
            <Descriptions items={details.metrics} />
          </details>
        )}
        {!!details.tests?.length && (
          <details>
            <summary>Tests</summary>
            <Links items={details.tests} />
          </details>
        )}
        {!!details.resources?.length && (
          <details>
            <summary>Related resources</summary>
            <Links items={details.resources} />
          </details>
        )}
      </div>
    </dialog>,
    document.body,
  )
}
