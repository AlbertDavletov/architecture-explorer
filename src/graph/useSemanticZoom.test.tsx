import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildWorld, framing } from './layout'
import { useSemanticZoom } from './useSemanticZoom'

const camera = vi.hoisted(() => ({
  view: { x: 0, y: 0, zoom: 1 },
  getViewport: vi.fn(() => ({ ...camera.view })),
  getZoom: vi.fn(() => camera.view.zoom),
  setViewport: vi.fn(async (view: { x: number; y: number; zoom: number }) => {
    camera.view = { ...view }
    return true
  }),
}))
vi.mock('@xyflow/react', () => ({ useReactFlow: () => camera }))
const size = { width: 1120, height: 720 }
const world = buildWorld(false)

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  })
  sessionStorage.clear()
  camera.view = framing(world, size).home
})
afterEach(() => {
  cleanup()
  document.body.replaceChildren()
  vi.useRealTimers()
})

function setup(reduced = false) {
  const element = document.createElement('div')
  const pane = document.createElement('div')
  pane.className = 'react-flow'
  element.append(pane)
  document.body.append(element)
  const canvas = { current: element }
  const hook = renderHook(
    ({ size, reduced }) => useSemanticZoom(world, size, reduced, canvas),
    { initialProps: { size, reduced } },
  )
  const finish = () => act(() => vi.advanceTimersByTime(1100))
  const select = (id?: string) => act(() => hook.result.current.select(id))
  const enter = (id: string) => {
    select(id)
    act(() => hook.result.current.enter(id))
    finish()
  }
  const wheel = (deltaY: number) =>
    act(() => {
      pane.dispatchEvent(
        new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }),
      )
    })
  return { ...hook, finish, select, enter, wheel }
}

describe('semantic navigation lifecycle', () => {
  it('restores views across four nested entries and deep ancestor returns', () => {
    const h = setup()
    const root = { ...camera.view, x: camera.view.x + 19 }
    camera.view = root
    for (let round = 0; round < 3; round++) {
      for (const id of ['clients', 'web', 'editor', 'rendering']) h.enter(id)
      expect(h.result.current.parent).toBe('rendering')
      h.select('compositor')
      h.wheel(300)
      h.finish()
      expect(h.result.current.parent).toBe('editor')
      act(() => h.result.current.back('clients'))
      h.finish()
      expect(h.result.current.selected).toBe('web')
      act(() => h.result.current.back())
      h.finish()
      expect(camera.view).toEqual(root)
    }
  })
  it.each([undefined, 'files', 'records'])(
    'exits Storage with selection %s and restores history',
    (selected) => {
      const h = setup()
      const root = { ...camera.view, x: camera.view.x + 43 }
      camera.view = root
      h.enter('cloud')
      const cloud = { ...camera.view, y: camera.view.y + 25 }
      camera.view = cloud
      h.enter('storage')
      h.select(selected)
      h.wheel(300)
      h.finish()
      expect(h.result.current.parent).toBe('cloud')
      expect(h.result.current.selected).toBe('storage')
      expect(camera.view).toEqual(cloud)
      h.select()
      h.wheel(300)
      h.finish()
      expect(h.result.current.parent).toBeUndefined()
      expect(camera.view).toEqual(root)
      h.wheel(900)
      h.finish()
      expect(h.result.current.navigating).toBe(false)
      expect(h.result.current.parent).toBeUndefined()
    },
  )
  it('keeps unselected and leaf inward zoom ordinary; enters only selected expandable cards', () => {
    const h = setup()
    h.wheel(-900)
    expect(h.result.current.navigating).toBe(false)
    h.select('cloud')
    h.wheel(-300)
    h.finish()
    expect(h.result.current.parent).toBe('cloud')
    h.enter('storage')
    h.select('files')
    h.wheel(-900)
    expect(h.result.current.navigating).toBe(false)
    expect(h.result.current.parent).toBe('storage')
  })
  it('allows outward zoom inside useful range and ignores small movements', () => {
    const h = setup()
    h.enter('cloud')
    h.select()
    camera.view = {
      ...camera.view,
      zoom: framing(world, size, 'cloud').maxZoom,
    }
    h.select()
    h.wheel(240)
    expect(h.result.current.navigating).toBe(false)
    // React Flow applies ordinary zoom; this hook test supplies that camera update.
    camera.view = {
      ...camera.view,
      zoom: camera.view.zoom * 2 ** (-240 * 0.002),
    }
    h.wheel(120)
    h.finish()
    expect(h.result.current.parent).toBeUndefined()
  })
  it('handles ancestor breadcrumbs and duplicate actions in one trip', () => {
    const h = setup()
    h.enter('clients')
    h.enter('web')
    act(() => {
      h.result.current.back()
      h.result.current.back()
      h.result.current.enter('web')
    })
    h.finish()
    expect(h.result.current.parent).toBeUndefined()
    expect(h.result.current.selected).toBe('clients')
    h.enter('cloud')
    h.enter('storage')
    act(() => h.result.current.back('cloud'))
    h.finish()
    expect(h.result.current.parent).toBe('cloud')
    expect(h.result.current.selected).toBe('storage')
  })
  it('absorbs momentum during transitions and until the gesture goes quiet', () => {
    const h = setup()
    h.enter('cloud')
    h.enter('storage')
    h.select()
    h.wheel(300)
    for (let i = 0; i < 24; i++) {
      act(() => vi.advanceTimersByTime(50))
      h.wheel(90)
    }
    expect(h.result.current.parent).toBe('cloud')
    expect(h.result.current.navigating).toBe(false)
    h.finish()
    h.wheel(300)
    h.finish()
    expect(h.result.current.parent).toBeUndefined()
  })
  it('finishes navigation after resize and supports reduced motion', () => {
    const h = setup()
    h.select('cloud')
    act(() => h.result.current.enter('cloud'))
    act(() => vi.advanceTimersByTime(150))
    h.rerender({ size: { width: 600, height: 500 }, reduced: false })
    h.finish()
    expect(h.result.current.parent).toBe('cloud')
    expect(Object.values(camera.view).every(Number.isFinite)).toBe(true)
    h.rerender({ size, reduced: true })
    h.select('storage')
    act(() => h.result.current.enter('storage'))
    expect(h.result.current.parent).toBe('storage')
    expect(h.result.current.navigating).toBe(false)
    expect(h.result.current.explored).toBe(true)
  })
})
