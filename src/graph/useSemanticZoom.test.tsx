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
  const manualLocked = { current: false }
  const hook = renderHook(
    ({ size, reduced }) =>
      useSemanticZoom(world, size, reduced, canvas, manualLocked),
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
  return { ...hook, finish, select, enter, wheel, manualLocked }
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

  it('crosses branches through their common ancestor in one locked trip and preserves ancestor history', () => {
    const h = setup()
    const root = { ...camera.view, x: camera.view.x + 27 }
    camera.view = root
    h.enter('clients')
    h.enter('web')
    camera.setViewport.mockClear()
    act(() => void h.result.current.goTo('assets'))
    expect(h.result.current.navigating).toBe(true)
    // Duplicate follow/back requests cannot create competing trips.
    act(() => {
      h.result.current.goTo('storage')
      h.result.current.back()
    })
    act(() => vi.advanceTimersByTime(3000))
    expect(h.result.current.parent).toBe('assets')
    expect(h.result.current.navigating).toBe(false)
    expect(camera.view).toEqual(framing(world, size, 'assets').home)
    const zooms = camera.setViewport.mock.calls.map(([v]) => v.zoom)
    expect(Math.min(...zooms)).toBeLessThan(
      framing(world, size, 'cloud').home.zoom,
    )
    act(() => h.result.current.back('cloud'))
    h.finish()
    expect(h.result.current.parent).toBe('cloud')
    act(() => h.result.current.back())
    h.finish()
    expect(camera.view).toEqual(root)
  })

  it('follows down multiple levels, does nothing at the destination and rejects leaf targets', () => {
    const h = setup()
    act(() => void h.result.current.goTo('assets'))
    act(() => vi.advanceTimersByTime(3000))
    expect(h.result.current.parent).toBe('assets')
    const view = { ...camera.view }
    act(() => void h.result.current.goTo('assets'))
    expect(h.result.current.navigating).toBe(false)
    act(() => void h.result.current.goTo('processing'))
    expect(h.result.current.navigating).toBe(false)
    expect(camera.view).toEqual(view)
    act(() => void h.result.current.goTo())
    act(() => vi.advanceTimersByTime(3000))
    expect(h.result.current.parent).toBeUndefined()
  })

  it('reframes cross-branch waypoints on resize and resolves the full trip with reduced motion', () => {
    const h = setup()
    h.enter('clients')
    h.enter('web')
    act(() => void h.result.current.goTo('assets'))
    act(() => vi.advanceTimersByTime(250))
    const narrow = { width: 390, height: 844 }
    h.rerender({ size: narrow, reduced: false })
    act(() => vi.advanceTimersByTime(3000))
    expect(h.result.current.parent).toBe('assets')
    expect(Object.values(camera.view).every(Number.isFinite)).toBe(true)
    h.rerender({ size: narrow, reduced: true })
    act(() => void h.result.current.goTo('web'))
    expect(h.result.current.parent).toBe('web')
    expect(h.result.current.navigating).toBe(false)
  })

  it('resolves guided arrival only after the camera and graph reach their destination', async () => {
    const h = setup()
    let arrived!: Promise<boolean>
    act(() => {
      arrived = h.result.current.goTo('assets')
    })
    const finish = vi.fn()
    void arrived.then(finish)
    act(() => vi.advanceTimersByTime(200))
    expect(finish).not.toHaveBeenCalled()
    expect(h.result.current.navigating).toBe(true)
    act(() => vi.advanceTimersByTime(3000))
    expect(await arrived).toBe(true)
    expect(h.result.current.parent).toBe('assets')
    expect(camera.view).toEqual(framing(world, size, 'assets').home)
  })

  it('keeps an in-frame interaction still and gently reframes one panned off-screen', async () => {
    const h = setup()
    camera.setViewport.mockClear()
    expect(
      await h.result.current.goTo(undefined, undefined, ['clients', 'cloud']),
    ).toBe(true)
    expect(camera.setViewport).not.toHaveBeenCalled()
    camera.view = { ...camera.view, x: camera.view.x + 1600 }
    let arrived!: Promise<boolean>
    act(() => {
      arrived = h.result.current.goTo(undefined, undefined, [
        'clients',
        'cloud',
      ])
    })
    expect(h.result.current.navigating).toBe(true)
    act(() => vi.advanceTimersByTime(500))
    expect(await arrived).toBe(true)
    expect(camera.view).toEqual(framing(world, size).home)
    expect(h.result.current.parent).toBeUndefined()
  })

  it('blocks manual camera gestures only during a guided action and restores them afterward', () => {
    const h = setup()
    h.select('clients')
    h.manualLocked.current = true
    act(() => h.result.current.enter('clients'))
    h.wheel(-900)
    act(() => h.result.current.back())
    expect(h.result.current.navigating).toBe(false)
    act(() => void h.result.current.goTo('assets'))
    act(() => vi.advanceTimersByTime(3000))
    expect(h.result.current.parent).toBe('assets')
    h.manualLocked.current = false
    act(() => h.result.current.back('cloud'))
    h.finish()
    expect(h.result.current.parent).toBe('cloud')
  })

  it('cancels a guided trip and restores departure context, camera and breadcrumb history', async () => {
    const h = setup()
    h.enter('clients')
    h.enter('web')
    const departure = { ...camera.view }
    const abort = new AbortController()
    let arrived!: Promise<boolean>
    act(() => {
      arrived = h.result.current.goTo('assets', abort.signal)
    })
    act(() => vi.advanceTimersByTime(650))
    act(() => abort.abort())
    expect(await arrived).toBe(false)
    expect(h.result.current.parent).toBe('web')
    expect(h.result.current.navigating).toBe(false)
    expect(camera.view).toEqual(departure)
    act(() => vi.advanceTimersByTime(4000))
    expect(camera.view).toEqual(departure)
    act(() => h.result.current.back('clients'))
    h.finish()
    expect(h.result.current.parent).toBe('clients')
  })

  it('cancellation after resize uses reframed departure and unmount settles pending arrival', async () => {
    const h = setup()
    h.enter('clients')
    const abort = new AbortController()
    let arrived!: Promise<boolean>
    act(() => {
      arrived = h.result.current.goTo('assets', abort.signal)
    })
    h.rerender({ size: { width: 390, height: 844 }, reduced: false })
    act(() => abort.abort())
    expect(await arrived).toBe(false)
    expect(h.result.current.parent).toBe('clients')
    expect(Object.values(camera.view).every(Number.isFinite)).toBe(true)
    act(() => {
      arrived = h.result.current.goTo('assets')
    })
    h.unmount()
    expect(await arrived).toBe(false)
  })
})
