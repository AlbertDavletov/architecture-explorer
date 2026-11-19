import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { CSSProperties } from 'react'
import { children, type Component } from '../model/architecture'
import { Icon } from '../ui/Icon'
import { CARD, type Place } from './layout'
import type { Emphasis } from '../workflows/overlay'
import type { Participation } from '../workflows/projection'

export type Exposure = 'steady' | 'outside' | 'inside'
export type Shell = 'closed' | 'boundary' | 'opening'
export type MapNode = Node<
  {
    component: Component
    place: Place
    vertical: boolean
    shell: Shell
    exposure: Exposure
    interactive: boolean
    selected: boolean
    showHint: boolean
    emphasis?: Emphasis
    participation?: Participation
    arriving?: boolean
    select: (id: string) => void
    enter: (id: string) => void
    inspect?: (trigger: HTMLButtonElement) => void
  },
  'component'
>

export function ComponentNode({ data }: NodeProps<MapNode>) {
  const {
    component,
    place,
    vertical,
    shell,
    exposure,
    interactive,
    selected,
    showHint,
    select,
    enter,
  } = data
  const count = children(component.id).length
  const styles = {
    '--card-width': CARD.width + 'px',
    '--card-height': CARD.height + 'px',
    '--unit': place.scale,
    '--inner-unit': place.childScale / place.scale,
    '--expanded-width': place.inside.width / place.scale + 'px',
    '--expanded-height': place.inside.height / place.scale + 'px',
    width: CARD.width,
    height: CARD.height,
  } as CSSProperties
  return (
    <>
      <Handle
        type="source"
        position={vertical ? Position.Bottom : Position.Right}
        id="out"
        isConnectable={false}
      />
      <Handle
        type="target"
        position={vertical ? Position.Top : Position.Left}
        id="in"
        isConnectable={false}
      />
      <div
        className={`node-unit ${component.color} ${exposure} ${shell}${selected ? ' selected' : ''} ${data.emphasis ?? ''} ${data.participation ?? ''}${data.arriving ? ' arriving' : ''}`}
        style={styles}
      >
        <div className="node-visual">
          <div className="shell-outline">
            {shell !== 'closed' && (
              <span className="boundary-name">
                <Icon name={component.icon} size={17} />
                {component.name}
              </span>
            )}
          </div>
          {shell !== 'boundary' && (
            <button
              className="node-card nopan nodrag"
              disabled={!interactive}
              aria-label={component.name}
              aria-description={
                data.participation === 'contains'
                  ? 'Contains workflow activity. Explore inside for detail.'
                  : data.participation === 'participating'
                    ? 'Participates in this workflow.'
                    : undefined
              }
              aria-pressed={selected}
              aria-describedby={
                interactive && count && showHint
                  ? `note-${component.id}`
                  : undefined
              }
              aria-keyshortcuts={count ? 'Enter' : undefined}
              title={count ? undefined : component.description}
              onClick={() => select(component.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && selected && count) {
                  e.preventDefault()
                  if (!e.repeat) enter(component.id)
                }
              }}
            >
              <span className="node-icon">
                <Icon name={component.icon} size={26} />
              </span>
              <strong>{component.name}</strong>
              {!!count && !selected && (
                <span
                  className={`node-affordance${data.participation === 'contains' ? ' workflow-inside' : ''}`}
                  title={
                    data.participation === 'contains'
                      ? 'Workflow activity inside'
                      : undefined
                  }
                >
                  <Icon name="nested" size={16} />
                </span>
              )}
              {interactive && selected && !!count && showHint && (
                <span className="card-note" id={`note-${component.id}`}>
                  Scroll to explore inside
                </span>
              )}
            </button>
          )}
          {interactive && selected && !!count && (
            <button
              type="button"
              className="enter-component nopan nodrag"
              aria-label={`Explore inside ${component.name}`}
              onClick={(event) => {
                event.stopPropagation()
                enter(component.id)
              }}
            >
              <Icon name="zoomIn" size={17} />
            </button>
          )}
          {interactive && selected && !count && data.inspect && (
            <button
              type="button"
              className="inspect-component nopan nodrag"
              aria-label={`Inspect ${component.name}`}
              aria-haspopup="dialog"
              onClick={(event) => {
                event.stopPropagation()
                data.inspect?.(event.currentTarget)
              }}
            >
              <Icon name="info" size={18} />
            </button>
          )}
        </div>
      </div>
    </>
  )
}
