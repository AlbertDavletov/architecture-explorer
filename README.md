# Architecture Explorer

Explore a software system through spatial Semantic Zoom, user-paced workflows, and a small Component Inspector. Built with React, TypeScript, Vite, and React Flow; everything runs in the browser.

**Loom is a fictional collaborative document editor.** Its architecture, workflow sequences, ownership, flags, and metrics are authored demo content. No production telemetry, private architecture, backend, or employer infrastructure is used.

## Quick Start

Use Node.js **22.12+ (22.x) or 24.x** and npm. Validated with Node 24.16.0 and npm 11.16.0.

```sh
git clone https://github.com/AlbertDavletov/architecture-explorer.git
cd architecture-explorer
npm ci
npm run dev
```

Open the local URL printed by Vite. In an existing checkout with dependencies installed, just run `npm run dev`.

```sh
npm test          # regression tests
npm run build     # type-check and build dist/
npm run preview   # serve the production build locally
```

Preview also prints its local URL. Build before previewing changes. For a presentation, keep the terminal running and open the URL before sharing your screen.

## Demo in 3 Minutes

Use a typical desktop window (1024 x 768 or larger). Each expandable card is entered by clicking it, then its magnifier; selected cards also accept Enter or an inward scroll.

1. **0:00 - Overview.** Start at **System overview**: Clients and Cloud. Explain blue requests, green data, and orange events. Architecture connections are static; workflows animate one interaction at a time.
2. **0:20 - Explore.** Enter **Clients > Web app > Editor > Rendering**. Show how Scene graph requests Text layout and Image layers, which feed Composition. Parent outlines and breadcrumbs retain context.
3. **0:50 - Return.** Click **System overview** in the breadcrumbs.
4. **1:00 - Follow an upload.** Open **Workflows**, choose **Upload an image**, then **Start**. After the first signal finishes, click **Next** to reach Cloud, then **Next** again to reach Asset services and see Uploads notify Processing. Each step waits for you.
5. **1:45 - Inspect.** Once that step finishes, click the info icon on **Processing**, without selecting the card. Expand **Metrics** to explain authored demo metadata. Close the dialog or press Escape: the map and workflow step stay in place.
6. **2:15 - Finish.** Click **Next** to add the preview to Catalog, then **Next** to show it in the web application. The workflow completes and offers Replay.
7. **2:40 - Reset.** Close the workflow, click **System overview**, then click empty canvas to clear selection. You are ready to repeat.

To reset from elsewhere: close Inspector first, close the workflow, click **System overview**, and click empty canvas. Reloading is also safe; all state is local to the page.

## Explore and inspect

Drag the background to pan. An inward wheel/trackpad gesture explores the selected expandable card. With nothing selected, zoom stays within the current area's useful range. Zooming outward past that range returns to the saved parent view. Breadcrumbs return to any ancestor; System overview also recenters the root.

Tab reaches cards and their actions. Enter/Space selects a card; Enter on a selected parent explores it. Escape clears selection or returns one level. Leaves never suggest zooming inside.

**Processing**, **Documents**, **Composition**, and **Notifications** have always-visible info actions while interactive. Parents and unconfigured leaves, such as Catalog and Files, have none. Inspector opens beside the component on desktop and as a scrollable bottom sheet on mobile. Close it before navigating or advancing a workflow. Opening/closing preserves selection, camera, breadcrumbs, history, and workflow progress, and returns keyboard focus to the info action.

All three workflows support Start, Next, completion, and Replay. You can explore manually between steps. Choosing a different workflow clears its predecessor's highlights without moving the camera. Reduced motion uses immediate navigation and a stationary signal marker.

## Demo architecture

The overview remains **Clients / Cloud**, with 29 components, five depths, and 2-5 siblings per populated area:

- **Clients:** Web app, Desktop, Mobile app. Web app contains Application shell and Editor; Editor contains Interface, Authoring, Document state, Rendering, and History.
- **Rendering:** Scene graph, Text layout, Image layers, Composition.
- **Cloud:** App services (API Gateway, Document service), Asset services (Uploads, Processing, Catalog), Data storage (Documents, Files), and Collaboration (Live sessions, Notifications).

Upload an image has five steps; Open a document and Save changes each have six. These are selected logical interactions, not exhaustive request traces. Service responses can summarize intermediate transport hops. Storage access belongs to services; the two stores have no invented connection between them.

See [the architecture audit](docs/DEMO_ARCHITECTURE.md) for before/after decisions, and [the product vision](docs/VISION.md) for design principles.

## Edit the demo

| Content                              | File                                                                                                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hierarchy and directed relationships | [src/model/architecture.json](src/model/architecture.json)                                                                                                                       |
| Workflow steps                       | [src/workflows/upload-image.json](src/workflows/upload-image.json), [open-document.json](src/workflows/open-document.json), [save-changes.json](src/workflows/save-changes.json) |
| Optional Inspector metadata          | [src/inspector/details.json](src/inspector/details.json)                                                                                                                         |

Give components unique IDs, names, and acyclic parent links. Sibling order determines deterministic placement. Relationships use existing IDs and `request`, `data`, or `event`. The model rejects duplicate IDs, missing parents/endpoints, self-connections, and invalid signal kinds. A workflow step must match a real directed relationship; tests check every projection level.

Inspector entries are keyed by explicitly configured leaf IDs. Optional fields include summary, owner, source, documentation, usedBy, featureFlags, metrics, tests, and resources. Empty sections are omitted; invalid entries are unavailable. Links must be absolute HTTP(S) URLs without credentials or whitespace. Public links point to this demo's actual resources; metrics and flags are descriptions, never live values or controls.

## Implementation and regression fixtures

The architecture model validates hierarchy and aggregates directed relationships independently of React Flow. Graph modules own deterministic layout, routing, and the camera. Semantic Zoom traverses adjacent parent boundaries and restores navigation history. Workflow projection uses that same model; the engine cancels obsolete async work, measures one signal per step, and waits for user input. Inspector metadata and its modal remain separate from all three.

Projection merges connections only when visible endpoints, direction, and signal kind match. The scene mounts the focused siblings and their parent boundary, plus adjacent groups during transitions. Routing avoids card interiors but does not globally minimize crossings.

Workflow actions follow Navigate, Focus, Signal, Hold. Signals take 650-1800 ms according to path length, followed by brief destination feedback; reduced motion uses a static marker. Closing during guided navigation restores the departure view and history to avoid a partially expanded scene. Closing during a signal keeps the reached view. Run tokens reject late completions from cancelled actions.

Four desktop siblings use a balanced 2 x 2 grid; mobile uses one column. Existing routing, camera state, cancellation, and arrival timing remain intact. The obsolete workflow `open` alias was removed in favor of the existing `preview` operation.

Synthetic layout tests still exercise up to eight siblings and seven levels. The dense-connections fixture remains available only in development at `?fixture=dense`, loaded on demand; production always uses Loom and excludes that fixture. These regressions are intentionally separate from the smaller presentation architecture.

## Limits

This is an authored prototype, with deterministic placement and illustrative sequential workflows. It does not extract architecture, collect traffic, persist edits, or connect to real services. At very small heights, pan to see crowded groups rather than shrinking labels below a readable size. Chromium validation supplements the automated suite; physical touch devices, screen readers, and other browsers need separate evaluation.
