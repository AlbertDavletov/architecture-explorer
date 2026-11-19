# Architecture Explorer

A standalone React, TypeScript, and Vite prototype for exploring a software system through spatial semantic zoom. React Flow provides the graph and camera. All architecture data and rendering stay in the browser.

## Run locally

Use Node.js 22.12+ or Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. `npm run build` type-checks and creates the production bundle in `dist/`. Use `npm run preview` to serve that bundle locally.

## Explore

Start with **Clients** and **Cloud**. Click Cloud to select it, then scroll or pinch inward, or click its magnifier. Its outline grows around **App services** and **Storage**. The magnifier is a separate button, accessible with Tab and Enter or Space. The scroll hint retires after the first completed entry in the tab session. Hover over a leaf for its description.

Drag the background to pan. Click empty canvas to clear the selection and zoom within the current graph's useful range. Zooming out beyond the useful range returns to the saved parent view regardless of selection. Breadcrumbs navigate smoothly to any ancestor. At the root, **System overview** recenters the map.

Use Tab to focus a card and Enter or Space to select it. Press Enter on a selected expandable card to explore it. Esc clears a selected card or returns one level when inside a component.

The default Architecture view is static. Blue connections represent requests, green data transfers, and orange events; chevrons show direction. Open **Workflows**, choose a scenario, then **Start** to explore it one step at a time. Each **Next** action finds and explains one interaction, then waits. Only its current visible interaction gets a moving dot. Reduced-motion preferences make navigation immediate and replace the workflow moving dot with a stationary marker.

## Edit the fixture

### Component Inspector (v0.8)

Select **Processing**, **Records**, **Composition** or **Notifications**, then use the small info button to open details. A normal click still only selects. Expandable components keep their zoom action; unconfigured leaves such as Search and Files have no extra action.

Inspector is a compact floating dialog beside the selected component when space permits, with an edge fallback. On mobile it becomes a scrollable bottom sheet. It never resizes or reframes the map. Close or Escape restores focus to the info button and preserves selection, viewport, navigation history and workflow progress. The native modal keeps keyboard focus inside and makes the underlying controls temporarily unavailable: close it to continue exploring or use Start/Next. Inspection is unavailable during guided navigation, focus or signals. The dialog is mounted outside the canvas so its scrolling and touch gestures cannot reach Semantic Zoom listeners.

Metadata lives separately in [src/inspector/details.json](src/inspector/details.json), keyed by existing component IDs:

```json
{
  "components": {
    "records": {
      "summary": "Keeps saved document models in fictional Loom.",
      "owner": "Loom Documents Team (fictional)",
      "usedBy": ["gateway"]
    }
  }
}
```

All fields are optional. Supported fields are `summary`, `owner`, `source: {title, url}`, `documentation`, `tests` and `resources` (arrays of `{title, url}`), `usedBy` (component IDs), and `featureFlags` / `metrics` (arrays of `{name, description?}`). Optional sections are collapsed initially; empty sections are omitted. Flags and metrics are explanatory descriptions, not controls or live values.

[getComponentDetails](src/inspector/details.ts) exposes only valid, explicitly configured leaves. Unknown IDs, parent entries, empty metadata, malformed fields, unknown consumer IDs and unsafe links make that entry unavailable without breaking other components. Links must be absolute HTTP(S) URLs without credentials or whitespace; external links open with `noopener noreferrer`. No placeholder metadata is generated. Component description is the authored fallback when an eligible entry omits its summary.

All demo ownership and behavior are fictional. The few links point to this public demo's actual fixture, guide, vision and tests, clearly labeled as demo resources; they do not pretend to be repositories for real Loom services. Omit source/documentation links when no real public destination exists. The graph receives only eligibility and an open callback, never the metadata objects. Semantic Zoom, workflow definitions and architectural structure remain independent of Inspector.

v0.8 validation: **154 tests passed across 18 files**, and `npm run build` passed. Production Chromium at 1440 × 900 and 390 × 844 exercised all four configured leaves, unconfigured leaves and parent exclusion, optional sections, safe links, keyboard/Escape/focus restoration, exact viewport and selection preservation (including a panned view), and scroll/touch isolation. The mobile sheet remained bounded and scrollable at 320 × 480. Upload an image completed with inspection in Preview and between steps; Inspector actions were absent during playback. Reduced motion and ordinary navigation regressions passed, the latter at four screen sizes. A local WebM demo was recorded; no browser console errors were observed.

Limits: local authored metadata only, no editing, live metrics or flag evaluation. Inspector is modal, so close it before navigating or continuing a workflow. Chromium was tested; physical touch devices, screen readers and other browsers still need evaluation.

### Structural data

Edit [src/model/architecture.json](src/model/architecture.json). Give each component a unique ID, name, description, icon, and color. Omit `parent` for a top-level component or use its parent's ID. Keep parent links acyclic. Sibling order in the file determines placement.

Add interactions to `relationships` using `from`, `to`, and one of `request`, `data`, or `event`. Reference the most specific components involved. For example, a request from `pages` to `gateway` contributes to the Clients → Cloud signal in the overview.

## How spatial zoom works

- [Layout](src/graph/layout.ts) assigns each component a stable rectangle in a common world. Child groups have smaller drawing units and share their parent's center. Narrow canvases stack siblings vertically.
- [Semantic zoom](src/graph/useSemanticZoom.ts) saves the viewport on entry. Icon, keyboard, and wheel entry share one action. The same camera controller handles returns and breadcrumbs. Immediate transitions take 570 ms. Multi-level returns use one 690 ms camera movement, progressively revealing adjacent groups along the route.
- Zoom limits derive from the visible group's bounds, available viewport area, and component drawing scale. Framing aims for readable labels and reasonable margins. The minimum permits a little extra breathing room. The maximum caps card enlargement and spacing. Resizing recalculates the limits and saved views. Crowded graphs can be panned at a readable scale.
- Gesture intent is tracked separately from camera scale, so a selected expandable card remains enterable at the upper limit. Inward intent equivalent to 143% enters it, and outward intent below 72% at the lower zoom boundary returns one level regardless of selection. A short quiet period absorbs momentum after navigation. Breadcrumb changes and shell visibility use the camera's animation clock.
- [Projection](src/model/architecture.ts) merges relationships by visible endpoints, direction, and signal type. The [scene](src/graph/scene.ts) mounts the focused siblings and their boundary, plus the adjacent group during a transition. [Signals](src/graph/SignalEdge.tsx) share the same geometry for static connections and finite workflow playback.

## Hierarchy stress fixture

The fictional Loom collaborative editor contains 35 components, 45 directed relationships, and five component levels. The overview has Clients and Cloud. Clients, Cloud, Editor, and Rendering each have five direct children. Assets has four. Branches include Web, Desktop, iOS, Android, asset uploads and processing, storage, notifications, and sharing.

Try Clients ? Web app ? Editor ? Rendering, return to System overview, then enter Cloud ? Assets. The deepest cards are at component depth five. All navigation derives from parent links.

Dense groups use smaller deterministic gaps. Connections that skip cards travel through row or side gutters. Direction and signal type remain distinct. Connections are static by default.

Validation covered 1440 ? 900, 1024 ? 768, 768 ? 1024, and 390 ? 844 in Chromium, including four nested entries, exact viewport restoration, another branch, wheel entry, and deselected exit. Automated tests also exercise eight siblings and seven levels without a fixed depth limit.

Observed limits include edge crossings in Cloud and Editor. Dense groups assign deterministic corridor offsets per visible connection and route vertical neighbors directly. Routing avoids card interiors but does not globally minimize crossings. The mobile fixture's five-card groups fit at readable scale. A synthetic eight-card mobile group requires panning to preserve readable labels. Larger systems have not been benchmarked.

The dense dependency experiment is documented below. Physical trackpad gestures and larger real-world relationship sets still need evaluation before introducing more routing machinery.

## Regression tests

Run npm test for architecture projection, viewport calculations, navigation lifecycle, gesture blocking, resize, reduced motion, and component interaction tests. Tests use Vitest, React Testing Library, and jsdom.

## Multiple guided workflows (v0.7)

Architecture shows structure; Workflows show behavior on the same canvas. Traffic Awareness remains a future optional Architecture capability. These are illustrative scenarios for fictional Loom, not telemetry, production traces, or the actual Adobe Express architecture.

Open **Workflows** and choose a scenario in the native dropdown to preview its participants. Direct participants have a subtle solid outline; containers have a dashed outline and an emphasized nested mark. Other nodes remain visible and navigable. **Start** explains only the first step. **Next** explains exactly one subsequent step. Nothing advances while you read or explore.

| Scenario | Logical steps and paths |
| --- | --- |
| Upload an image | Request upload: Pages → Gateway; Store image: Gateway → Uploads; Prepare preview: Uploads → Processing; Add to library: Processing → Catalog; Show image: Catalog → Pages. The existing five-step definition is unchanged. |
| Open a document | Open document: Pages → Gateway; Find saved content: Gateway → Records; Read document: Records → Gateway; Load into editor: Gateway → Authoring; Show document: Authoring → Rendering. |
| Save changes | Apply your edit: Interface → Authoring; Keep a revision: Authoring → History; Request a save: Authoring → Gateway; Save document: Gateway → Records; Confirm saved state: Records → Notifications; Show saved status: Notifications → Interface. |

All three use the same engine, lens, projected edges, adaptive signal duration and camera controller. Requests describe logical operations, so the existing Gateway → Records request relationship supports both reading and saving. History records a local revision; it is not a second cloud write.

Three explicit relationships were added to [Loom](src/model/architecture.json): `records → gateway (data)` returns the saved model, `gateway → authoring (data)` delivers it to the editor, and `records → notifications (event)` announces successful persistence. These support the new scenarios; no workflow invents edges at render time. Components, layout, Upload an image and the synthetic dense fixture are unchanged.

### Selection and switching

The closed UI is one **Workflows** button. Opening it focuses a native selector with three choices; selecting enters Preview without playback. The selected name remains visible in the dropdown alongside Start, Next or Replay and Close. Selection is enabled in Preview, Waiting and Completed (also after an error), and disabled during navigation, focus or signal playback. Manual semantic navigation also briefly disables it. Close remains available throughout.

Switching invalidates the previous run, cancels its outstanding work and clears progress, arrival feedback and duration measurements. The new scenario starts in Preview, preserving the current context, pan and zoom. If that area contains no participants, ancestors remain discoverable via breadcrumbs and the lens; Start automatically navigates to the first interaction. It does not reset to the overview merely because a selection changed.

The native selector supports keyboard and touch input, with visible focus outlines. Escape inside the panel closes it and returns focus to Workflows without also navigating the map; an open native option popup may consume Escape first. Close resets the choice, so the next opening shows the selection prompt. There is no separate workflow sidebar or session manager.

Each action follows **Navigate → Focus → Signal → Hold**. A clearly visible interaction stays in place; otherwise the existing projection finds the deepest valid context exposing distinct endpoints. For Upload an image starting at the overview, the contexts are System overview, Cloud, Assets, Assets, System overview. Open a document visits Cloud storage and ends inside Editor; Save changes starts inside Editor, visits Cloud storage and notifications, and ends at the overview. Cross-branch routes pass through the lowest common ancestor using the existing spatial coordinates and adjacent-level transitions.

If manual panning moved an interaction off-screen at the correct level, the action gently reframes it before the signal. Already visible endpoints do not cause camera movement.

After the camera arrives, a short 180 ms focus phase highlights the participants, then one signal traverses the real connection once in 650–1800 ms, using an adaptive duration based on SVG path length. Blue means request, green data, orange event. Its arrival completes the step and enables Next immediately. The destination receives one restrained border emphasis for 420 ms, then returns to the quieter completed outline. The feedback clears on Next, Replay, Close or semantic navigation and never blocks exploration. Reduced motion uses a brief static border with no transition. Completed connections remain subtly emphasized. After the last step, **Completed** and **Replay** remain until closed; there is no looping or automatic reset.

Between steps you can pan, zoom, use breadcrumbs and explore unrelated components. This does not change workflow progress. Next finds the next interaction from your new location. During the requested navigation/focus/signal action, graph interactions and Next are temporarily disabled so the camera and signal cannot compete; Close stays available. There are no Follow, Continue, Pause, speed or timeline controls.

**Close** removes the overlay and cancels outstanding work. Closing during a guided camera trip restores its departure context, camera and breadcrumb history, including after resize. This deliberate rollback avoids leaving partially expanded semantic shells; it can visibly snap back. Closing during a signal keeps the reached view and removes the signal. Reduced motion resolves navigation immediately and uses a stationary marker for 600 ms before waiting for Next. An internal action with no external edge uses the same finite static highlight instead of inventing a signal path.

### JSON and validation

Edit [upload-image.json](src/workflows/upload-image.json), [open-document.json](src/workflows/open-document.json), or [save-changes.json](src/workflows/save-changes.json). To extend the catalog, add another JSON definition and import it into the ordered array in [catalog.ts](src/workflows/catalog.ts); no React UI changes are needed. For example:

```json
{
  "id": "request-upload",
  "name": "Request an upload",
  "execution": "sequence",
  "steps": [
    {
      "id": "request",
      "name": "Request upload",
      "from": "pages",
      "to": "gateway",
      "kind": "request",
      "description": "The web app requests an upload."
    }
  ]
}
```

The catalog requires a nonempty short name of at most 40 characters for every step. Descriptions are optional and available on hover. The lower-level parser retains its optional-name compatibility, but catalog entries must be named. Catalog validation checks unique workflow IDs, unique step IDs within each workflow, names, component references and the exact directed signal type. Array order defines both selector order and execution order. Invalid definitions fail clearly instead of being silently skipped; missing interactions never become invented edges. The experimental dense fixture reports that the Loom catalog is unavailable. Stable step IDs and explicit sequence execution leave room for future branching definitions, but no parallel scheduler is implemented.

### State, navigation and cancellation

[Workflow state](src/workflows/useWorkflow.ts) owns the logical index and explicit preview, navigating, focusing, animating, waiting and completed phases, plus closed/error states. A synchronous run token prevents repeated clicks and stale callbacks from completing or skipping steps. One effect orchestrates each requested action. Navigation completion is awaited before focus or signals; navigation alone cannot complete a logical step.

[Semantic zoom](src/graph/useSemanticZoom.ts) exposes a cancellable arrival promise for guided routes while retaining ordinary entry/back behavior. Abort restores the saved departure and invalidates queued camera frames. Closing or unmounting aborts navigation and clears phase timers. The shared [edge renderer](src/graph/SignalEdge.tsx) reports CSS animation completion, with a measured-duration fallback if a browser event is missed. Reduced-motion/internal actions use deterministic static dwell timers. Neither path selects the next step: only a new user action can do that.

[Projection](src/workflows/projection.ts) stays independent of playback and resolves logical component IDs to visible ancestors, real directed relationships, internal actions or out-of-view interactions. [The lens](src/workflows/overlay.ts) adds participation/current/completed emphasis without changing coordinates or introducing another graph engine. The architecture data model has no camera or workflow state.

The scene supplies fixed React Flow handle coordinates from the deterministic node boxes. Without these, controlled lens updates could clear measured handle bounds between ResizeObserver deliveries, leaving all edges absent and a guided step waiting for a signal that never mounted. A regression test exercises the real React Flow store across repeated lens changes and every hierarchy level, without relying on DOM measurement timing. Camera and edge routing algorithms are unchanged.

Known limits: three authored sequential scenarios; no workflow editor, previous-step control, branching engine, real telemetry or cross-level signal travel. Workflow timing is explanatory, not real latency; long routes are capped at 1800 ms. Guided cancellation rolls back the camera rather than freezing between levels. Existing dense-routing crossings remain. Physical trackpad gestures, physical touch devices and larger real architectures still need evaluation.

v0.7 validation: **114 tests passed across 16 files**, including catalog rejection, every-level projections, all three complete engine sequences, switching isolation, stale callbacks, native control behavior and the handle-bounds regression. `npm run build` passed. Production Chromium at **1440 × 900** and **390 × 844** completed all three workflows, manual exploration in Assets between Save changes steps, switching in Preview/Waiting/Completed, exact context and panned-viewport preservation, Replay/Close, keyboard selection and Escape. Each scenario's first step also passed with reduced motion. Frame checks verified camera-before-signal sequencing and a stationary camera during animation; native CSS durations matched the adaptive calculation. The mobile panel stayed outside the editor cards. Ordinary deep-entry, exact viewport restoration, breadcrumbs, wheel entry and deselected exit passed at 1440 × 900, 1024 × 768, 768 × 1024 and 390 × 844. No browser console errors were observed. A local WebM demo records the desktop scenarios.

Previous v0.6.2 validation: **90 tests passed** across 12 files, and `npm run build` passed. Chromium at 1440 × 900 and 390 × 844 completed all five user-paced steps, manual cross-branch exploration between steps, repeated Next clicks, replay, cancellation during camera/signal activity and reduced motion. Per-frame checks verified no signals during navigation/focus and no camera motion during a signal. Additional checks verified off-screen interactions reframe before animation. Existing deep-entry, breadcrumb, exact viewport restoration and wheel-navigation regressions passed at 1440 × 900, 1024 × 768, 768 × 1024 and 390 × 844. A local WebM recording captured the desktop journey.

### Transition polish

The workflow-only [duration helper](src/workflows/signalDuration.ts) uses `round(clamp(450 + 450 × ln(1 + length / 80), 650, 1800))` in sibling-local SVG units. Invalid lengths fall back to 650 ms. The renderer assigns this same value to CSS and reports it to the existing completion fallback, which waits an additional 100 ms if no animation-end event arrives. Native completion remains the primary signal; run tokens reject stale callbacks. No traffic-frequency calculation or user speed control is involved.

Measured on the actual Loom routes in Chromium:

| Longest route at viewport | Before | After |
| --- | ---: | ---: |
| 1440 × 900 — Uploads → Processing (516 units) | 12,286 ms | 1,354 ms |
| 390 × 844 — App services → Assets (445 units) | 10,595 ms | 1,297 ms |

All five native CSS animation durations matched the calculated values on desktop and mobile (650–1354 ms for these fixtures). Browser checks also verified that destination feedback begins after completion, appears only once, clears promptly, leaves Next enabled, and respects reduced motion. Camera-before-signal sequencing, Preview, manual cross-branch exploration, Replay and Close passed; ordinary navigation regressions passed at all four documented sizes.

Guided camera timing is unchanged: 440 ms per adjacent boundary, with the existing 570–2400 ms bounds. The reviewed cross-branch route retains enough time to recognize the common overview and arrive comfortably. Removing the 10–12 second signal waits provides the responsiveness improvement without shortening that orientation interval or changing manual Semantic Zoom.

## Dense connections experiment (v0.5.1)

Start with npm run dev and open http://127.0.0.1:5173/?fixture=dense. The query selects the synthetic fixture only in development. The default URL and production builds use Loom.

[src/model/dense.json](src/model/dense.json) contains seven visible groups, two internal workers per group, and 28 underlying dependencies. Repeated cross-group relationships collapse to 13 visible connections while internal links remain inside their groups. Requests, data, events, and reverse directions are all represented. No dependency is dropped to reduce clutter.

Before routing changes, unrelated pairs reused corridor segments and same-column neighbors took six-point side detours. After the changes, dense groups use stable offsets for ports and corridors, same-column neighbors connect directly, and the fixture has no positive-length shared straight segments. Exact open-interior segment/rectangle tests cover every routed segment, including thin crossings and six direction/type lanes. Point crossings remain visible, especially around Documents and on the long return to Workspace. This router does not promise a crossing-free drawing.

In v0.5.1, signals ran continuously at 42 sibling-local units per second with deterministic per-edge phases. v0.6 keeps the geometry and chevrons but makes the default graph static; only selected workflow interactions animate. The dense fixture has no workflow definition.

Browser validation used the actual development scenario at 1440 and 1024 pixels wide, including before/after screenshots, internal disclosure, moving signals, and reduced motion. Production regression checks traversed Loom through Rendering, restored the root viewport, explored Assets, and tested wheel entry and deselected exit at all four documented screen sizes. Production ignores the experimental query.

The remaining readability limit is the number of distinct relationships, not just repeated dependencies. A substantially denser real group should be reviewed for meaningful domain abstraction before adding more routing machinery. The experiment retains every distinct visible relationship and adds no artificial hierarchy.
