import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ComponentNode } from './ComponentNode'
import { buildWorld } from './layout'
import { scene } from './scene'
import type { NodeProps } from '@xyflow/react'
import type { MapNode } from './ComponentNode'

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
