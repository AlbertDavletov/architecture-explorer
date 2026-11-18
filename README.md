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

Drag the background to pan. Click empty canvas to clear the selection and zoom within the current graph's useful range. Immediately after entry, zooming out returns to the saved parent view. Breadcrumbs navigate smoothly to any ancestor. At the root, **System overview** recenters the map.

Use Tab to focus a card and Enter or Space to select it. Press Enter on a selected expandable card to explore it. Esc clears a selected card or returns one level when inside a component.

Blue dots represent requests, green dots data transfers, and orange dots events. They show illustrative interactions. Reduced-motion preferences make navigation immediate and replace moving dots with stationary markers.

## Edit the fixture

Edit [src/model/architecture.json](src/model/architecture.json). Give each component a unique ID, name, description, icon, and color. Omit `parent` for a top-level component or use its parent's ID. Keep parent links acyclic. Sibling order in the file determines placement.

Add interactions to `relationships` using `from`, `to`, and one of `request`, `data`, or `event`. Reference the most specific components involved. For example, a request from `pages` to `gateway` contributes to the Clients → Cloud signal in the overview.

## How spatial zoom works

- [Layout](src/graph/layout.ts) assigns each component a stable rectangle in a common world. Child groups have smaller drawing units and share their parent's center. Narrow canvases stack siblings vertically.
- [Semantic zoom](src/graph/useSemanticZoom.ts) saves the viewport on entry. Icon, keyboard, and wheel entry share one action. The same camera controller handles returns and breadcrumbs. Immediate transitions take 570 ms. Multi-level returns use one 690 ms camera movement, progressively revealing adjacent groups along the route.
- Zoom limits derive from the visible group's bounds, available viewport area, and component drawing scale. Framing aims for readable labels and reasonable margins. The minimum permits a little extra breathing room. The maximum caps card enlargement and spacing. Resizing recalculates the limits and saved views. Crowded graphs can be panned at a readable scale.
- Gesture intent is tracked separately from camera scale, so a selected expandable card remains enterable at the upper limit. Inward intent equivalent to 143% enters it, and outward intent below 72% with an expandable component selected returns one level. A short quiet period absorbs momentum after navigation. Breadcrumb changes and shell visibility use the camera's animation clock.
- [Projection](src/model/architecture.ts) merges relationships by visible endpoints, direction, and signal type. The [scene](src/graph/scene.ts) mounts the focused siblings and their boundary, plus the adjacent group during a transition. [Signals](src/graph/SignalEdge.tsx) use a shared clock to preserve their phase across visits.

The sample contains three levels and two siblings per area. Deterministic layout and edge routing are designed for small groups.
