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

The default Architecture view is static. Blue connections represent requests, green data transfers, and orange events; chevrons show direction. Open **Workflows → Start** to watch **Upload an image**. Only its current visible interaction gets a moving dot. Reduced-motion preferences make navigation immediate and replace the workflow moving dot with a stationary marker.

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

## Guided workflows (v0.6)

Architecture shows structure; Workflows show behavior on the same canvas. Traffic Awareness remains a future optional Architecture capability. There is no telemetry or private infrastructure.

Open **Workflows** to preview the participating areas, then **Start**. The five-step **Upload an image** scenario follows a request from Pages to Gateway, image data from Gateway to Uploads, an event from Uploads to Processing, prepared data from Processing to Catalog, and the ready image from Catalog to Pages. The first step includes the user's action of choosing an image. These are illustrative logical interactions, not a production trace. Three relationships were explicitly added to Loom in v0.6: `gateway → uploads / data`, `uploads → processing / event`, and `catalog → pages / data`. All previous components and relationships remain; the dense fixture is unchanged.

The overview shows the request and final response, with three intermediate steps indicated **Inside Cloud**. To see more detail, enter **Cloud → Assets**, then start or replay: the event into Processing and data returning to Catalog are visible there. Search stays visible but subdued. Navigation never happens automatically.

### JSON and validation

Edit [src/workflows/upload-image.json](src/workflows/upload-image.json). A minimal valid example is:

```json
{
  "id": "request-upload",
  "name": "Request an upload",
  "execution": "sequence",
  "steps": [
    {
      "id": "request",
      "from": "pages",
      "to": "gateway",
      "kind": "request",
      "description": "The web app requests an upload."
    }
  ]
}
```

Workflow and step descriptions are optional. Stable step IDs and an explicit execution mode leave a boundary for future branching/parallel definitions; only ordered sequences are accepted today. [Validation](src/workflows/model.ts) checks schema, unique step IDs, component references, and exact directed relationships including signal kind. Missing interactions are errors, never fabricated edges. The experimental dense fixture reports that this Loom workflow is unavailable.

### Projection and playback

[Workflow projection](src/workflows/projection.ts) independently resolves endpoints through architecture ancestry into visible siblings and the same directed/type edge IDs used by the scene. It distinguishes a visible relationship, an internal step inside one aggregated component, an interaction partly/fully outside the focused area, and an invalid relationship. Internal steps highlight the component without drawing a self-edge. Outside steps highlight any visible endpoint and explain the limited view. The logical sequence is never filtered or reordered when the architectural level changes.

[Playback](src/workflows/useWorkflow.ts) owns logical step, run ID, status, and finite timers independently of navigation and architecture. [The overlay](src/workflows/overlay.ts) adds emphasis and a signal descriptor to existing nodes/edges without changing positions, geometry, selection or navigation callbacks. The shared edge renderer measures its SVG path; a single dot travels once at 42 sibling-local units/second, followed by a 600 ms arrival dwell. Internal/outside steps and reduced-motion steps last 2.2 seconds. No animation events are required for completion. Reduced motion uses a static marker and the same logical order. Final path highlighting stays for 2.6 seconds, then the canvas becomes neutral; **Replay** remains available. **Close workflow** cancels playback immediately.

Changing architectural level, recentering, or switching between row/column layouts pauses active playback and preserves its logical step. **Continue** restarts that interaction in the new view; fractional signal progress is not preserved. Pan and ordinary zoom continue without pausing. This projection boundary prepares cross-level exploration without introducing automatic camera choreography or a general execution engine.

### Limits and validation

Only one authored workflow is exposed; there is no editing UI, branching scheduler, traffic metric, live trace or cross-level signal travel. Hidden/internal steps are described and timed, not expanded automatically. Long visible routes take longer at the fixed speed. Existing dense-routing crossings remain.

`npm test` includes workflow schema/projection, deterministic timer lifecycle, close/replay, navigation pause, reduced motion, static default edges and preservation of graph/navigation properties, alongside the existing hierarchy and navigation regressions. `npm run build` checks TypeScript and creates the production bundle.

v0.6 verification: **60 tests passed** across 10 files; production build passed. Chromium checks at 1440 × 900 and 390 × 844 covered static defaults, nested Assets playback, actual dot movement, event/data ordering, dimming, finite completion, neutral reset, replay, navigation pause with the same logical step, close, and stationary reduced-motion playback. Additional mobile checks confirmed the compact panel does not obscure cards in Cloud or Assets. The dense development fixture remains static and reports an incompatible workflow instead of fabricating interactions. Existing navigation regressions passed at 1440 × 900, 1024 × 768, 768 × 1024, and 390 × 844, including deep entries, saved viewport restoration, wheel entry and deselected exit.

## Workflow Lens and Follow (v0.6.1)

Selecting the workflow enters **Preview**, without starting any timers or signals. Only the workflow's endpoints and containing ancestors are relevant. Direct participants have a subtle solid outline; containers have a dashed outline and an emphasized nested-component mark. Hover or assistive text explains that activity is inside. Other nodes are gently dimmed and remain fully selectable and expandable. Existing component and signal colors retain their meanings. Preview does not alter positions or the camera.

During playback or pause, the current endpoints (or their visible ancestors) get a stronger neutral outline. Internal steps identify the active container. If a step is outside the current view, the compact control names the architectural context where it can be found. **Follow** appears only when the current interaction is hidden and a different useful context exists. There is no automatic camera tracking, and no Follow action when the interaction is already visible.

**Follow** pauses the workflow immediately and preserves its logical step. [Context resolution](src/workflows/projection.ts) searches shared endpoint ancestors from deepest to shallowest and selects the deepest context exposing a valid projected relationship. For example, the upload request resolves to System overview, the transfer to Cloud, and processing/catalog steps to Assets. If an ancestor endpoint cannot form a visible sibling edge, the resolver falls back to a truthful internal representation. Invalid relationships have no navigation target.

[Context routes](src/graph/navigation.ts) connect the current and destination containers through their lowest common ancestor. [The navigation controller](src/graph/useSemanticZoom.ts) executes the route with one lock, one clock, and camera waypoints at each adjacent boundary. From Clients / Web app to Cloud / Assets, it zooms out through Clients and System overview, then enters Cloud and Assets. Only adjacent graph levels are mounted. Follow uses comfortable destination framing and preserves saved common-ancestor viewports for ordinary Back/breadcrumb navigation. Resize reframes the entire route; reduced motion resolves it immediately. Manual entry and breadcrumb animation retain their existing behavior.

Try starting in the overview, then **Follow** when step 2 is inside Cloud. Continue until step 3, return to the overview, and explore Clients / Web app while paused. **Follow** now takes you across branches into Assets with step 3 still selected. Continue, replay, or close at any time. Unrelated components stay available in both Preview and playback.

The PoC still restarts the preserved interaction when **Continue** is pressed; it does not restore a dot's fractional progress. Follow reveals an architectural context, not an individual leaf's details. Navigation is temporarily locked during its single coordinated transition, as with ordinary Semantic Zoom. Preview emphasis fades in/out; semantic navigation temporarily uses the ordinary graph and restores the lens on arrival. No fixtures, dependencies or routing algorithms changed in v0.6.1.

v0.6.1 verification: **69 tests passed** across 11 files; `npm run build` passed. New tests cover participation and hidden ancestors, unrelated access, deepest valid contexts and internal fallback, common-ancestor routes, duplicate navigation protection, same-context no-op, saved history, resize/reduced motion, Preview and explicit Follow pause. Chromium at 1440 × 900 and 390 × 844 verified Preview before playback, exploration of unrelated Storage, internal Follow, Web app → overview → Assets with the same logical step, paused arrival, completion/replay/close and reduced motion. Frame samples confirmed the cross-branch camera passed through the common overview and mounted at most adjacent graph levels. Mobile checks confirmed controls do not obscure cards, including the longer first-step description. Existing deep navigation, exact viewport restoration, wheel entry and deselected exit checks passed at all four documented sizes. The dense development fixture still reports that the Loom workflow is unavailable.

## Dense connections experiment (v0.5.1)

Start with npm run dev and open http://127.0.0.1:5173/?fixture=dense. The query selects the synthetic fixture only in development. The default URL and production builds use Loom.

[src/model/dense.json](src/model/dense.json) contains seven visible groups, two internal workers per group, and 28 underlying dependencies. Repeated cross-group relationships collapse to 13 visible connections while internal links remain inside their groups. Requests, data, events, and reverse directions are all represented. No dependency is dropped to reduce clutter.

Before routing changes, unrelated pairs reused corridor segments and same-column neighbors took six-point side detours. After the changes, dense groups use stable offsets for ports and corridors, same-column neighbors connect directly, and the fixture has no positive-length shared straight segments. Exact open-interior segment/rectangle tests cover every routed segment, including thin crossings and six direction/type lanes. Point crossings remain visible, especially around Documents and on the long return to Workspace. This router does not promise a crossing-free drawing.

In v0.5.1, signals ran continuously at 42 sibling-local units per second with deterministic per-edge phases. v0.6 keeps the geometry and chevrons but makes the default graph static; only selected workflow interactions animate. The dense fixture has no workflow definition.

Browser validation used the actual development scenario at 1440 and 1024 pixels wide, including before/after screenshots, internal disclosure, moving signals, and reduced motion. Production regression checks traversed Loom through Rendering, restored the root viewport, explored Assets, and tested wheel entry and deselected exit at all four documented screen sizes. Production ignores the experimental query.

The remaining readability limit is the number of distinct relationships, not just repeated dependencies. A substantially denser real group should be reviewed for meaningful domain abstraction before adding more routing machinery. The experiment retains every distinct visible relationship and adds no artificial hierarchy.
