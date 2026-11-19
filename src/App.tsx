import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { ReactFlow, ReactFlowProvider } from '@xyflow/react'
import { ancestry, components, architecture } from './model/architecture'
import { ComponentNode, type MapNode } from './graph/ComponentNode'
import { SignalEdge, type MapEdge } from './graph/SignalEdge'
import { buildWorld, type Size } from './graph/layout'
import { scene } from './graph/scene'
import { useSemanticZoom } from './graph/useSemanticZoom'
import { Icon } from './ui/Icon'
import { createWorkflowCatalog } from './workflows/catalog'
import { projectStep, projectParticipation } from './workflows/projection'
import { useWorkflow } from './workflows/useWorkflow'
import { workflowOverlay } from './workflows/overlay'
import { WorkflowControl } from './workflows/WorkflowControl'
import { getComponentDetails } from './inspector/details'
import { ComponentInspector } from './inspector/ComponentInspector'

const workflowCatalog = (() => {
  try {
    return {
      workflows: createWorkflowCatalog(architecture),
      error: undefined,
    }
  } catch (error) {
    return {
      workflows: [],
      error: `Workflow unavailable for this architecture. ${error instanceof Error ? error.message : String(error)}`,
    }
  }
})()

const nodeTypes = { component: ComponentNode }
const edgeTypes = { signal: SignalEdge }

function Map({
  canvas,
  size,
}: {
  canvas: RefObject<HTMLDivElement | null>
  size: Size
}) {
  const vertical = size.width < 660
  const world = useMemo(() => buildWorld(vertical), [vertical])
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  const manualLocked = useRef(false)
  const nav = useSemanticZoom(world, size, reduced, canvas, manualLocked)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [workflowId, setWorkflowId] = useState<string>()
  const [inspected, setInspected] = useState<{
    id: string
    trigger: HTMLButtonElement
  }>()
  const workflow = workflowCatalog.workflows.find(
    (item) => item.id === workflowId,
  )
  const projections = useMemo(
    () =>
      workflow?.steps.map((step) =>
        projectStep(step, architecture, nav.parent),
      ) ?? [],
    [workflow, nav.parent],
  )
  const playback = useWorkflow(workflow, architecture, nav, reduced)
  manualLocked.current = playback.busy
  const participation = useMemo(
    () =>
      workflow
        ? projectParticipation(workflow, architecture, nav.parent)
        : undefined,
    [workflow, nav.parent],
  )
  const baseGraph = useMemo(
    () =>
      scene(
        world,
        nav.parent,
        nav.journey,
        nav.selected,
        nav.explored,
        nav.select,
        nav.enter,
        playback.busy,
      ),
    [
      world,
      nav.parent,
      nav.journey,
      nav.selected,
      nav.explored,
      nav.select,
      nav.enter,
      playback.busy,
    ],
  )
  const overlay = workflowOverlay(
    baseGraph,
    projections,
    playback,
    nav.navigating,
    participation,
  )
  const graph = {
    ...overlay,
    nodes: overlay.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        inspect:
          node.data.interactive &&
          node.data.selected &&
          getComponentDetails(node.id)
            ? (trigger: HTMLButtonElement) =>
                setInspected({ id: node.id, trigger })
            : undefined,
      },
    })),
  }
  const path = ancestry(nav.parent)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.key !== 'Escape' ||
        e.defaultPrevented ||
        playback.busy ||
        inspected
      )
        return
      if (nav.selected && nav.selected !== nav.parent) nav.select()
      else if (nav.parent) nav.back(components.get(nav.parent)?.parent)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [nav.selected, nav.parent, nav.back, nav.select, playback.busy, inspected])
  return (
    <>
      <ReactFlow<MapNode, MapEdge>
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={nav.home}
        minZoom={nav.minZoom}
        maxZoom={nav.maxZoom}
        onPaneClick={() => nav.select()}
        panOnDrag={!nav.navigating && !playback.busy}
        zoomOnPinch={!nav.navigating && !playback.busy}
        zoomOnScroll={!nav.navigating && !playback.busy}
        zoomOnDoubleClick={false}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        preventScrolling
        proOptions={{ hideAttribution: true }}
      />
      <nav className="breadcrumbs" aria-label="Architecture path">
        <span className="brand-mark">
          <Icon name="brand" size={19} />
        </span>
        <button
          disabled={nav.navigating || playback.busy}
          aria-current={!nav.parent ? 'location' : undefined}
          title={nav.parent ? 'Return to system overview' : 'Recenter overview'}
          onClick={() => nav.back()}
        >
          System overview
        </button>
        {path.map((item, i) => (
          <Fragment key={item.id}>
            <Icon name="chevron" size={13} />
            <button
              disabled={
                nav.navigating || playback.busy || i === path.length - 1
              }
              aria-current={i === path.length - 1 ? 'location' : undefined}
              onClick={() => nav.back(item.id)}
            >
              {item.name}
            </button>
          </Fragment>
        ))}
      </nav>
      <WorkflowControl
        {...workflowCatalog}
        workflow={workflow}
        open={pickerOpen}
        onOpen={() => setPickerOpen(true)}
        onChoose={(id) => {
          if (
            workflowCatalog.workflows.some((item) => item.id === id) &&
            playback.preview()
          )
            setWorkflowId(id)
        }}
        onClose={() => {
          playback.close()
          setPickerOpen(false)
          setWorkflowId(undefined)
        }}
        playback={playback}
        navigating={nav.navigating}
      />
      {inspected && (
        <ComponentInspector
          component={components.get(inspected.id)!}
          details={getComponentDetails(inspected.id)!}
          trigger={inspected.trigger}
          onClose={() => setInspected(undefined)}
        />
      )}
      <div className="legend" aria-label="Illustrative signals">
        {[
          ['request', 'Requests'],
          ['data', 'Data transfers'],
          ['event', 'Events'],
        ].map(([kind, label]) => (
          <span key={kind}>
            <i className={kind} />
            {label}
          </span>
        ))}
      </div>
    </>
  )
}
export default function App() {
  const canvas = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<Size>()
  useLayoutEffect(() => {
    const el = canvas.current!
    const measure = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <main className="canvas" ref={canvas} aria-label="Architecture Explorer">
      <ReactFlowProvider>
        {size && <Map canvas={canvas} size={size} />}
      </ReactFlowProvider>
    </main>
  )
}
