import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { components } from '../model/architecture'
import { getComponentDetails } from './details'
import { ComponentInspector } from './ComponentInspector'
import type { ComponentDetails } from './model'
import { architecture } from '../model/architecture'
import { createWorkflowCatalog } from '../workflows/catalog'
import { STATIC_DWELL, useWorkflow } from '../workflows/useWorkflow'

const originalShowModal = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
)
const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close',
)

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }),
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    }),
  })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  Object.defineProperty(
    HTMLDialogElement.prototype,
    'showModal',
    originalShowModal ?? { configurable: true, value: undefined },
  )
  Object.defineProperty(
    HTMLDialogElement.prototype,
    'close',
    originalClose ?? { configurable: true, value: undefined },
  )
})

function setup(
  id = 'processing',
  details: ComponentDetails = getComponentDetails(id)!,
) {
  const underlyingClick = vi.fn()
  function Harness() {
    const [trigger, setTrigger] = useState<HTMLButtonElement>()
    return (
      <div onClick={underlyingClick}>
        <button
          onClick={(event) => {
            event.stopPropagation()
            setTrigger(event.currentTarget)
          }}
        >
          Info
        </button>
        {trigger && (
          <ComponentInspector
            component={components.get(id)!}
            details={details}
            trigger={trigger}
            onClose={() => setTrigger(undefined)}
          />
        )}
      </div>
    )
  }
  const h = render(<Harness />)
  const trigger = screen.getByRole('button', { name: 'Info' })
  trigger.focus()
  fireEvent.click(trigger)
  return { ...h, trigger, underlyingClick }
}

it('opens the correct leaf and renders authored sections with safe ordinary links', () => {
  const h = setup()
  const dialog = screen.getByRole('dialog', { name: 'Processing' })
  expect(dialog.getAttribute('aria-modal')).toBe('true')
  expect(dialog.parentElement).toBe(document.body)
  expect(screen.getByText('Loom Media Team (fictional)')).toBeTruthy()
  expect(
    [...dialog.querySelectorAll('summary')].map((s) => s.textContent),
  ).toEqual([
    'Documentation',
    'Used by',
    'Feature flags',
    'Metrics',
    'Tests',
    'Related resources',
  ])
  expect(dialog.querySelectorAll('details[open]')).toHaveLength(0)
  for (const section of dialog.querySelectorAll('details')) section.open = true
  expect(screen.getByText('Uploads')).toBeTruthy()
  expect(screen.getByText('compact-previews')).toBeTruthy()
  expect(screen.getByText('Previews prepared')).toBeTruthy()
  for (const link of dialog.querySelectorAll('a')) {
    expect(link.protocol).toBe('https:')
    expect(link.target).toBe('_blank')
    expect(link.rel).toBe('noopener noreferrer')
  }
  fireEvent.click(screen.getByText('Metrics'))
  expect(h.underlyingClick).not.toHaveBeenCalled()
})

it('renders a minimal entry without empty sections or fabricated ownership/links', () => {
  setup('compositor')
  const dialog = screen.getByRole('dialog', { name: 'Composition' })
  expect(dialog.querySelectorAll('details,a')).toHaveLength(0)
  expect(screen.queryByText('Owner')).toBeNull()
  expect(screen.queryByText('Source code')).toBeNull()
})

it.each(['button', 'escape', 'cancel'])(
  'closes by %s, restores focus and prevents underlying interactions',
  (method) => {
    const h = setup()
    const dialog = screen.getByRole('dialog')
    const windowEscape = vi.fn()
    window.addEventListener('keydown', windowEscape)
    if (method === 'button')
      fireEvent.click(
        screen.getByRole('button', { name: 'Close component details' }),
      )
    if (method === 'escape') fireEvent.keyDown(dialog, { key: 'Escape' })
    if (method === 'cancel')
      fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(h.trigger)
    expect(h.underlyingClick).not.toHaveBeenCalled()
    expect(windowEscape).not.toHaveBeenCalled()
    window.removeEventListener('keydown', windowEscape)
  },
)

it('preserves real guided workflow state and makes no navigation call when opened or closed', async () => {
  vi.useFakeTimers()
  const workflow = createWorkflowCatalog(architecture)[0]
  const navigation = { navigating: false, goTo: vi.fn(async () => true) }
  function Harness() {
    const p = useWorkflow(workflow, architecture, navigation, true)
    const [trigger, setTrigger] = useState<HTMLButtonElement>()
    return (
      <>
        <button onClick={p.open}>Preview</button>
        <button onClick={p.start}>Start</button>
        <button onClick={p.next}>Next</button>
        <button onClick={(event) => setTrigger(event.currentTarget)}>
          Info
        </button>
        <output data-testid="progress">
          {JSON.stringify({
            status: p.status,
            index: p.index,
            run: p.run,
            completed: p.completedCount,
          })}
        </output>
        {trigger && (
          <ComponentInspector
            component={components.get('processing')!}
            details={getComponentDetails('processing')!}
            trigger={trigger}
            onClose={() => setTrigger(undefined)}
          />
        )}
      </>
    )
  }
  render(<Harness />)
  fireEvent.click(screen.getByText('Preview'))
  fireEvent.click(screen.getByText('Start'))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
  act(() => vi.advanceTimersByTime(STATIC_DWELL))
  const before = screen.getByTestId('progress').textContent
  expect(JSON.parse(before!).status).toBe('waiting')
  navigation.goTo.mockClear()
  fireEvent.click(screen.getByText('Info'))
  fireEvent.click(screen.getByText('Metrics'))
  fireEvent.click(
    screen.getByRole('button', { name: 'Close component details' }),
  )
  expect(screen.getByTestId('progress').textContent).toBe(before)
  expect(navigation.goTo).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('Next'))
  expect(JSON.parse(screen.getByTestId('progress').textContent!).index).toBe(1)
})

it('switches to CSS sheet positioning on small viewports and cleans up on unmount', () => {
  const originalWidth = window.innerWidth
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1200,
  })
  const h = setup()
  const dialog = screen.getByRole('dialog')
  expect(dialog.style.left).not.toBe('')
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 390,
  })
  act(() => window.dispatchEvent(new Event('resize')))
  expect(dialog.style.left).toBe('')
  expect(dialog.style.top).toBe('')
  h.unmount()
  expect(HTMLDialogElement.prototype.close).toHaveBeenCalled()
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: originalWidth,
  })
})
