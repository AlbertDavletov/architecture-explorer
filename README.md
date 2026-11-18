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

The default Architecture view is static. Blue connections represent requests, green data transfers, and orange events; chevrons show direction. Open **Workflows → Start** to explore **Upload an image** one step at a time. Each **Next** action finds and explains one interaction, then waits. Only its current visible interaction gets a moving dot. Reduced-motion preferences make navigation immediate and replace the workflow moving dot with a stationary marker.

## Edit the fixture

Edit [src/model/architecture.json](src/model/architecture.json). Give each component a unique ID, name, description, icon, and color. Omit `parent` for a top-level component or use its parent's ID. Keep parent links acyclic. Sibling order in the file determines placement.

Add interactions to `relationships` using `from`, `to`, and one of `request`, `data`, or `event`. Reference the most specific components involved. For example, a request from `pages` to `gateway` contributes to the Clients → Cloud signal in the overview.

## How spatial zoom works

- [Layout](src/graph/layout.ts) assigns each component a stable rectangle in a common world. Child groups have smaller drawing units and share their parent's center. Narrow canvases stack siblings vertically.
- [Semantic zoom](src/graph/useSemanticZoom.ts) saves the viewport on entry. Icon, keyboard, and wheel entry share one action. The same camera controller handles returns and breadcrumbs. Immediate transitions take 570 ms. Multi-level returns use one 690 ms camera movement, progressively revealing adjacent groups along the route.
- Zoom limits derive from the visible group's bounds, available viewport area, and component drawing scale. Framing aims for readable labels and reasonable margins. The minimum permits a little extra breathing room. The maximum caps card enlargement and spacing. Resizing recalculates the limits and saved views. Crowded graphs can be panned at a readable scale.
- Gesture intent is tracked separately from camera scale, so a selected expandable card remains enterable at the upper limit. Inward intent equivalent to 143% enters it, and outward intent below 72% at the lower zoom boundary returns one level regardless of selection. A short quiet period absorbs momentum after navigation. Breadcrumb changes and shell visibility use the camera's animation clock.
- [Projection](src/model/architecture.ts) merges relationships by visible endpoints, direction, and signal type. The [scene](src/graph/scene.ts) mounts the focused siblings and their boundary, plus the adjacent group during a transition. [Signals](src/graph/SignalEdge.tsx) share the same geometry for static connections and finite workflow playback.

## Hierarchy stress fixture

The fictional Loom collaborative editor contains 35 components, 42 directed relationships, and five component levels. The overview has Clients and Cloud. Clients, Cloud, Editor, and Rendering each have five direct children. Assets has four. Branches include Web, Desktop, iOS, Android, asset uploads and processing, storage, notifications, and sharing.

Try Clients ? Web app ? Editor ? Rendering, return to System overview, then enter Cloud ? Assets. The deepest cards are at component depth five. All navigation derives from parent links.

Dense groups use smaller deterministic gaps. Connections that skip cards travel through row or side gutters. Direction and signal type remain distinct. Connections are static by default.

Validation covered 1440 ? 900, 1024 ? 768, 768 ? 1024, and 390 ? 844 in Chromium, including four nested entries, exact viewport restoration, another branch, wheel entry, and deselected exit. Automated tests also exercise eight siblings and seven levels without a fixed depth limit.

Observed limits include edge crossings in Cloud and Editor. Dense groups assign deterministic corridor offsets per visible connection and route vertical neighbors directly. Routing avoids card interiors but does not globally minimize crossings. The mobile fixture's five-card groups fit at readable scale. A synthetic eight-card mobile group requires panning to preserve readable labels. Larger systems have not been benchmarked.

The dense dependency experiment is documented below. Physical trackpad gestures and larger real-world relationship sets still need evaluation before introducing more routing machinery.

## Regression tests

Run npm test for architecture projection, viewport calculations, navigation lifecycle, gesture blocking, resize, reduced motion, and component interaction tests. Tests use Vitest, React Testing Library, and jsdom.

## Guided step-by-step workflows (v0.6.2)

Architecture shows structure; Workflows show behavior on the same canvas. Traffic Awareness remains a future optional Architecture capability. This is an illustrative Loom scenario, not telemetry or a production trace.

Open **Workflows** to preview participants. Direct participants have a subtle solid outline; containers have a dashed outline and an emphasized nested mark. Other nodes remain visible and navigable. **Start** explains only the first step. **Next** explains exactly one subsequent step. Nothing advances while you read or explore.

The five steps are **Request upload → Store image → Prepare preview → Add to library → Show image**. They use the existing directed relationships from Pages to Gateway, Gateway to Uploads, Uploads to Processing, Processing to Catalog, and Catalog to Pages. Loom and the dense fixture are unchanged in this release.

Each action follows **Navigate → Focus → Signal → Hold**. A clearly visible interaction stays in place; otherwise the existing projection finds the deepest valid context exposing distinct endpoints. For the normal overview journey, the contexts are System overview, Cloud, Assets, Assets, System overview. Cross-branch routes pass through the lowest common ancestor using the existing spatial coordinates and adjacent-level transitions.

If manual panning moved an interaction off-screen at the correct level, the action gently reframes it before the signal. Already visible endpoints do not cause camera movement.

After the camera arrives, a short 180 ms focus phase highlights the participants, then one signal traverses the real connection once at 42 sibling-local units/second. Blue means request, green data, orange event. Its arrival completes the step and enables Next. Completed interactions retain a quieter outline and connection emphasis. After the last step, **Completed** and **Replay** remain until closed; there is no looping or automatic reset.

Between steps you can pan, zoom, use breadcrumbs and explore unrelated components. This does not change workflow progress. Next finds the next interaction from your new location. During the requested navigation/focus/signal action, graph interactions and Next are temporarily disabled so the camera and signal cannot compete; Close stays available. There are no Follow, Continue, Pause, speed or timeline controls.

**Close** removes the overlay and cancels outstanding work. Closing during a guided camera trip restores its departure context, camera and breadcrumb history, including after resize. This deliberate rollback avoids leaving partially expanded semantic shells; it can visibly snap back. Closing during a signal keeps the reached view and removes the signal. Reduced motion resolves navigation immediately and uses a stationary marker for 600 ms before waiting for Next. An internal action with no external edge uses the same finite static highlight instead of inventing a signal path.

### JSON and validation

Edit [src/workflows/upload-image.json](src/workflows/upload-image.json). For example:

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

Step names and descriptions are optional. Without a short name, the control falls back to endpoint names. Descriptions remain available on hover. Stable step IDs and explicit sequence execution leave room for future branching definitions, but no parallel scheduler is implemented. Validation checks IDs, names, component references and the exact directed signal type. Missing interactions are surfaced as errors, never invented edges. The experimental dense fixture reports that this Loom workflow is unavailable.

### State, navigation and cancellation

[Workflow state](src/workflows/useWorkflow.ts) owns the logical index and explicit preview, navigating, focusing, animating, waiting and completed phases, plus closed/error states. A synchronous run token prevents repeated clicks and stale callbacks from completing or skipping steps. One effect orchestrates each requested action. Navigation completion is awaited before focus or signals; navigation alone cannot complete a logical step.

[Semantic zoom](src/graph/useSemanticZoom.ts) exposes a cancellable arrival promise for guided routes while retaining ordinary entry/back behavior. Abort restores the saved departure and invalidates queued camera frames. Closing or unmounting aborts navigation and clears phase timers. The shared [edge renderer](src/graph/SignalEdge.tsx) reports CSS animation completion, with a measured-duration fallback if a browser event is missed. Reduced-motion/internal actions use deterministic static dwell timers. Neither path selects the next step: only a new user action can do that.

[Projection](src/workflows/projection.ts) stays independent of playback and resolves logical component IDs to visible ancestors, real directed relationships, internal actions or out-of-view interactions. [The lens](src/workflows/overlay.ts) adds participation/current/completed emphasis without changing coordinates or introducing another graph engine. The architecture data model has no camera or workflow state.

Known limits: one authored sequential scenario; no previous-step control, branching engine, real telemetry or cross-level signal travel. Long routes take longer at the fixed speed. Guided cancellation rolls back the camera rather than freezing between levels. Existing dense-routing crossings remain. Physical trackpad gestures and larger real architectures still need evaluation.

Validation: **79 tests passed** across 11 files, and `npm run build` passed. Chromium at 1440 × 900 and 390 × 844 completed all five user-paced steps, manual cross-branch exploration between steps, repeated Next clicks, replay, cancellation during camera/signal activity and reduced motion. Per-frame checks verified no signals during navigation/focus and no camera motion during a signal. Additional checks verified off-screen interactions reframe before animation. Existing deep-entry, breadcrumb, exact viewport restoration and wheel-navigation regressions passed at 1440 × 900, 1024 × 768, 768 × 1024 and 390 × 844. A local WebM recording captured the desktop journey.

## Dense connections experiment (v0.5.1)

Start with npm run dev and open http://127.0.0.1:5173/?fixture=dense. The query selects the synthetic fixture only in development. The default URL and production builds use Loom.

[src/model/dense.json](src/model/dense.json) contains seven visible groups, two internal workers per group, and 28 underlying dependencies. Repeated cross-group relationships collapse to 13 visible connections while internal links remain inside their groups. Requests, data, events, and reverse directions are all represented. No dependency is dropped to reduce clutter.

Before routing changes, unrelated pairs reused corridor segments and same-column neighbors took six-point side detours. After the changes, dense groups use stable offsets for ports and corridors, same-column neighbors connect directly, and the fixture has no positive-length shared straight segments. Exact open-interior segment/rectangle tests cover every routed segment, including thin crossings and six direction/type lanes. Point crossings remain visible, especially around Documents and on the long return to Workspace. This router does not promise a crossing-free drawing.

In v0.5.1, signals ran continuously at 42 sibling-local units per second with deterministic per-edge phases. v0.6 keeps the geometry and chevrons but makes the default graph static; only selected workflow interactions animate. The dense fixture has no workflow definition.

Browser validation used the actual development scenario at 1440 and 1024 pixels wide, including before/after screenshots, internal disclosure, moving signals, and reduced motion. Production regression checks traversed Loom through Rendering, restored the root viewport, explored Assets, and tested wheel entry and deselected exit at all four documented screen sizes. Production ignores the experimental query.

The remaining readability limit is the number of distinct relationships, not just repeated dependencies. A substantially denser real group should be reviewed for meaningful domain abstraction before adding more routing machinery. The experiment retains every distinct visible relationship and adds no artificial hierarchy.
