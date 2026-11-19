import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { architecture } from '../model/architecture'
import { createWorkflowCatalog } from './catalog'
import { WorkflowControl } from './WorkflowControl'
import { FOCUS_DWELL, useWorkflow } from './useWorkflow'

const workflows = createWorkflowCatalog(architecture)
beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function setup() {
  const goTo = vi.fn(async () => true)
  function Harness() {
    const [open, setOpen] = useState(false)
    const [id, setId] = useState<string>()
    const workflow = workflows.find((item) => item.id === id)
    const playback = useWorkflow(
      workflow,
      architecture,
      { navigating: false, goTo },
      false,
    )
    return (
      <WorkflowControl
        workflows={workflows}
        workflow={workflow}
        open={open}
        onOpen={() => setOpen(true)}
        onChoose={(id) => {
          if (playback.preview()) setId(id)
        }}
        onClose={() => {
          playback.close()
          setOpen(false)
          setId(undefined)
        }}
        playback={playback}
        navigating={false}
      />
    )
  }
  const result = render(<Harness />)
  return { ...result, goTo }
}

it('opens an accessible native selector and previews a choice without playback', () => {
  const h = setup()
  expect(screen.queryByRole('combobox')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Workflows' }))
  const select = screen.getByRole('combobox', {
    name: 'Workflow',
  }) as HTMLSelectElement
  expect(document.activeElement).toBe(select)
  expect([...select.options].map((o) => o.text)).toEqual([
    'Choose a workflow',
    ...workflows.map((w) => w.name),
  ])
  expect(screen.queryByRole('button', { name: 'Start' })).toBeNull()
  fireEvent.change(select, { target: { value: 'open-document' } })
  expect(select.value).toBe('open-document')
  expect(screen.getByRole('region').dataset.phase).toBe('preview')
  expect(screen.getByRole('button', { name: 'Start' })).toBeDefined()
  act(() => vi.advanceTimersByTime(60000))
  expect(h.goTo).not.toHaveBeenCalled()
  fireEvent.change(select, { target: { value: 'save-changes' } })
  expect(select.value).toBe('save-changes')
  expect(screen.queryByRole('status')).toBeNull()
  expect(h.goTo).not.toHaveBeenCalled()
})

it('disables selection during an action and supports Escape cancellation with focus return', async () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: 'Workflows' }))
  const select = screen.getByRole('combobox') as HTMLSelectElement
  fireEvent.change(select, { target: { value: 'upload-image' } })
  fireEvent.click(screen.getByRole('button', { name: 'Start' }))
  expect(select.disabled).toBe(true)
  expect(
    (screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
  await act(async () => {
    await vi.advanceTimersByTimeAsync(FOCUS_DWELL)
  })
  expect(select.disabled).toBe(true)
  const windowEscape = vi.fn()
  window.addEventListener('keydown', windowEscape)
  fireEvent.keyDown(screen.getByRole('button', { name: 'Close workflow' }), {
    key: 'Escape',
  })
  expect(windowEscape).not.toHaveBeenCalled()
  window.removeEventListener('keydown', windowEscape)
  act(() => vi.advanceTimersByTime(10000))
  expect(document.activeElement).toBe(
    screen.getByRole('button', { name: 'Workflows' }),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Workflows' }))
  expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('')
  expect(screen.getByRole('region').dataset.phase).toBe('selecting')
})
