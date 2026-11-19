import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ComponentNode } from './ComponentNode'
import { buildWorld } from './layout'
import { scene } from './scene'
import type { NodeProps } from '@xyflow/react'
import type { MapNode } from './ComponentNode'
import { getComponentDetails } from '../inspector/details'

vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Bottom: 'bottom', Top: 'top', Right: 'right', Left: 'left' },
}))
afterEach(cleanup)
function mount(id: string, parent?: string, selected?: string) {
  const select = vi.fn(),
    enter = vi.fn()
  const node = scene(
    buildWorld(false),
    parent,
    undefined,
    selected,
    false,
    select,
    enter,
  ).nodes.find((n) => n.id === id)!
  const props = { data: node.data } as NodeProps<MapNode>
  const rendered = render(<ComponentNode {...props} />)
  return { ...rendered, select, enter, props }
}
it('selects cards and gives the magnifier an independent entry action', () => {
  const h = mount('cloud')
  fireEvent.click(screen.getByRole('button', { name: 'Cloud' }))
  expect(h.select).toHaveBeenCalledWith('cloud')
  expect(
    screen.queryByRole('button', { name: 'Explore inside Cloud' }),
  ).toBeNull()
  h.rerender(
    <ComponentNode
      {...h.props}
      data={{ ...h.props.data, selected: true, showHint: true }}
    />,
  )
  expect(screen.getByText('Scroll to explore inside')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Explore inside Cloud' }))
  expect(h.enter).toHaveBeenCalledWith('cloud')
  expect(h.select).toHaveBeenCalledTimes(1)
  fireEvent.keyDown(screen.getByRole('button', { name: 'Cloud' }), {
    key: 'Enter',
  })
  expect(h.enter).toHaveBeenCalledTimes(2)
})
it('does not suggest entry for leaves', () => {
  const h = mount('files', 'storage', 'files')
  expect(
    screen.queryByRole('button', { name: 'Explore inside Files' }),
  ).toBeNull()
  expect(screen.queryByText('Scroll to explore inside')).toBeNull()
  fireEvent.keyDown(screen.getByRole('button', { name: 'Files' }), {
    key: 'Enter',
  })
  expect(h.enter).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Files' }))
  expect(h.select).toHaveBeenCalledWith('files')
})

it('offers explicit inspection only on selected, interactive leaves with details', () => {
  const h = mount('processing', 'assets')
  const inspect = vi.fn()
  const data = {
    ...h.props.data,
    inspect: getComponentDetails('processing') ? inspect : undefined,
  }
  h.rerender(<ComponentNode {...h.props} data={data} />)
  fireEvent.click(screen.getByRole('button', { name: 'Processing' }))
  expect(inspect).not.toHaveBeenCalled()
  expect(
    screen.queryByRole('button', { name: 'Inspect Processing' }),
  ).toBeNull()
  h.rerender(<ComponentNode {...h.props} data={{ ...data, selected: true }} />)
  const info = screen.getByRole('button', { name: 'Inspect Processing' })
  expect(info.getAttribute('aria-haspopup')).toBe('dialog')
  fireEvent.click(info)
  expect(inspect).toHaveBeenCalledWith(info)
  expect(h.select).toHaveBeenCalledTimes(1)
  expect(h.enter).not.toHaveBeenCalled()
  h.rerender(
    <ComponentNode
      {...h.props}
      data={{ ...data, selected: true, interactive: false }}
    />,
  )
  expect(
    screen.queryByRole('button', { name: 'Inspect Processing' }),
  ).toBeNull()
})

it('never offers inspection on a parent, even if an inspect callback is supplied', () => {
  const h = mount('assets', 'cloud', 'assets')
  h.rerender(
    <ComponentNode {...h.props} data={{ ...h.props.data, inspect: vi.fn() }} />,
  )
  expect(screen.queryByRole('button', { name: 'Inspect Assets' })).toBeNull()
  expect(
    screen.getByRole('button', { name: 'Explore inside Assets' }),
  ).toBeTruthy()
})

it('does not offer inspection for an unconfigured leaf', () => {
  mount('search', 'assets', 'search')
  expect(getComponentDetails('search')).toBeUndefined()
  expect(screen.queryByRole('button', { name: 'Inspect Search' })).toBeNull()
})
