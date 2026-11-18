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

Blue dots represent requests, green dots data transfers, and orange dots events. They show illustrative interactions. Reduced-motion preferences make navigation immediate and replace moving dots with stationary markers.

## Edit the fixture

Edit [src/model/architecture.json](src/model/architecture.json). Give each component a unique ID, name, description, icon, and color. Omit `parent` for a top-level component or use its parent's ID. Keep parent links acyclic. Sibling order in the file determines placement.

Add interactions to `relationships` using `from`, `to`, and one of `request`, `data`, or `event`. Reference the most specific components involved. For example, a request from `pages` to `gateway` contributes to the Clients → Cloud signal in the overview.

## How spatial zoom works

- [Layout](src/graph/layout.ts) assigns each component a stable rectangle in a common world. Child groups have smaller drawing units and share their parent's center. Narrow canvases stack siblings vertically.
- [Semantic zoom](src/graph/useSemanticZoom.ts) saves the viewport on entry. Icon, keyboard, and wheel entry share one action. The same camera controller handles returns and breadcrumbs. Immediate transitions take 570 ms. Multi-level returns use one 690 ms camera movement, progressively revealing adjacent groups along the route.
- Zoom limits derive from the visible group's bounds, available viewport area, and component drawing scale. Framing aims for readable labels and reasonable margins. The minimum permits a little extra breathing room. The maximum caps card enlargement and spacing. Resizing recalculates the limits and saved views. Crowded graphs can be panned at a readable scale.
- Gesture intent is tracked separately from camera scale, so a selected expandable card remains enterable at the upper limit. Inward intent equivalent to 143% enters it, and outward intent below 72% at the lower zoom boundary returns one level regardless of selection. A short quiet period absorbs momentum after navigation. Breadcrumb changes and shell visibility use the camera's animation clock.
- [Projection](src/model/architecture.ts) merges relationships by visible endpoints, direction, and signal type. The [scene](src/graph/scene.ts) mounts the focused siblings and their boundary, plus the adjacent group during a transition. [Signals](src/graph/SignalEdge.tsx) use a shared clock to preserve their phase across visits.

## Hierarchy stress fixture

The fictional Loom collaborative editor contains 35 components, 39 directed relationships, and five component levels. The overview has Clients and Cloud. Clients, Cloud, Editor, and Rendering each have five direct children. Assets has four. Branches include Web, Desktop, iOS, Android, asset uploads and processing, storage, notifications, and sharing.

Try Clients ? Web app ? Editor ? Rendering, return to System overview, then enter Cloud ? Assets. The deepest cards are at component depth five. All navigation derives from parent links.

Dense groups use smaller deterministic gaps. Connections that skip cards travel through row or side gutters. Direction and signal type remain distinct, with one dot per aggregated relationship.

Validation covered 1440 ? 900, 1024 ? 768, 768 ? 1024, and 390 ? 844 in Chromium, including four nested entries, exact viewport restoration, another branch, wheel entry, and deselected exit. Automated tests also exercise eight siblings and seven levels without a fixed depth limit.

Observed limits include edge crossings in Cloud and Editor. Dense groups assign deterministic corridor offsets per visible connection and route vertical neighbors directly. Routing avoids card interiors but does not globally minimize crossings. The mobile fixture's five-card groups fit at readable scale. A synthetic eight-card mobile group requires panning to preserve readable labels. Larger systems have not been benchmarked.

The next useful step is testing a denser dependency fixture and physical trackpad gestures, then evaluating whether crossing reduction justifies a more sophisticated router.

## Regression tests

Run npm test for architecture projection, viewport calculations, navigation lifecycle, gesture blocking, resize, reduced motion, and component interaction tests. Tests use Vitest, React Testing Library, and jsdom.

## Dense connections experiment (v0.5.1)

Start with npm run dev and open http://127.0.0.1:5173/?fixture=dense. The query selects the synthetic fixture only in development. The default URL and production builds use Loom.

[src/model/dense.json](src/model/dense.json) contains seven visible groups, two internal workers per group, and 28 underlying dependencies. Repeated cross-group relationships collapse to 13 visible connections while internal links remain inside their groups. Requests, data, events, and reverse directions are all represented. No dependency is dropped to reduce clutter.

Before routing changes, unrelated pairs reused corridor segments and same-column neighbors took six-point side detours. After the changes, dense groups use stable offsets for ports and corridors, same-column neighbors connect directly, and the fixture has no positive-length shared straight segments. Exact open-interior segment/rectangle tests cover every routed segment, including thin crossings and six direction/type lanes. Point crossings remain visible, especially around Documents and on the long return to Workspace. This router does not promise a crossing-free drawing.

Signal speed remains 42 sibling-local units per second with one dot per aggregated relationship. Deterministic per-edge phases stagger dots of the same type. Small chevrons indicate direction even with reduced motion.

Browser validation used the actual development scenario at 1440 and 1024 pixels wide, including before/after screenshots, internal disclosure, moving signals, and reduced motion. Production regression checks traversed Loom through Rendering, restored the root viewport, explored Assets, and tested wheel entry and deselected exit at all four documented screen sizes. Production ignores the experimental query.

The remaining readability limit is the number of distinct relationships, not just repeated dependencies. A substantially denser real group should be reviewed for meaningful domain abstraction before adding more routing machinery. The experiment retains every distinct visible relationship and adds no artificial hierarchy.
