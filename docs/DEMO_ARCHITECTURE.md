# Loom demo architecture audit

Loom is a fictional collaborative document editor. This audit refines presentation data without adding product capabilities.

## Before and after

| Area           | Before (v0.8)                                         | After (v0.9)                                              |
| -------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| Whole demo     | 35 components, 45 directed relationships              | 29 components, 31 directed relationships                  |
| Overview       | Clients, Cloud                                        | Unchanged                                                 |
| Clients        | Web app, Mobile app, Desktop, iOS, Android            | Web app, Desktop, Mobile app                              |
| Web app        | Pages, Local cache, Editor                            | Application shell, Editor                                 |
| Editor         | Interface, Authoring, Rendering, History, Export      | Interface, Authoring, Document state, Rendering, History  |
| Rendering      | Scene, Text, Images, Effects, Composition             | Scene graph, Text layout, Image layers, Composition       |
| Cloud          | App services, Storage, Assets, Notifications, Sharing | App services, Asset services, Data storage, Collaboration |
| App services   | Gateway, Worker                                       | API Gateway, Document service                             |
| Asset services | Uploads, Catalog, Processing, Search                  | Uploads, Processing, Catalog                              |
| Data storage   | Records, Files, with a direct connection              | Documents, Files, accessed by services                    |
| Collaboration  | Loose cloud-level responsibilities                    | Live sessions, Notifications                              |

Five depths remain, with 2-5 siblings in each populated area. Removed mobile internals (Screens and Inbox) and duplicated platform variants were stress scaffolding, not necessary responsibilities in this demo. Existing meaningful IDs are retained, including `records` for Documents. `pages` becomes `shell`; the generic Worker becomes an explicit Document service.

## Relationship decisions

- Application shell, Desktop, and Mobile app use API Gateway. The gateway routes document operations to Document service; storage is never called directly by the client.
- Authoring updates Document state. That state supplies Rendering and History; History restores snapshots into state. This replaces an unclear rendering-to-authoring feedback cycle.
- Scene graph requests Text layout and Image layers; both feed Composition. Removed artificial cycles and the misleading text-to-image pipeline.
- Document service reads/writes Documents and announces saved changes through Collaboration. Live sessions send illustrative collaborative updates to the editor.
- Uploads stores originals in Files and triggers Processing. Processing reads files and passes preview information to Catalog; Catalog makes the asset available to Application shell.
- Documents and Files have no direct dependency. File access omitted from the short upload walkthrough still exists in the architecture.
- Workflow signals are selected logical interactions. For example, Document service to Document state summarizes a response; it does not assert a direct physical connection bypassing the gateway. Save confirmation follows the authored completed persistence step. There is no claim of real timing, packet tracing, or complete protocol coverage.

## Focused hardening

Four siblings use two aligned rows/columns instead of three plus an isolated card. Routing and the camera state machine remain unchanged; collision tests cover all areas in desktop and mobile layouts.

The model now rejects duplicate IDs, missing parents/endpoints, blank identifiers/names, self-relations, invalid kinds, and parent cycles before graph creation. Repeated legitimate relationships still aggregate stably. The unused workflow `open` wrapper was removed; callers use the existing `preview` operation. No dependency changes or new state framework were needed.

Existing async cancellation, history, replay, Inspector, and reduced-motion regressions remain. Synthetic hierarchy tests retain eight-sibling and seven-level cases. The dense fixture is an explicit development-only lazy import, excluded from the production bundle; it is not a presentation architecture. Broader controller/projection rewrites were deliberately avoided because they would add regression risk without improving this demo.

## Validation

- `npm test`: 167 tests across 18 files, including hierarchy validation, aggregation, collision-free routing, navigation/history, cancellation, workflow contexts/completion, and Inspector eligibility/context.
- `npm run build`: TypeScript and the production Vite build pass. Node 24.16.0 / npm 11.16.0; a clean temporary installation with `npm ci --offline` and a subsequent build also pass using the existing lockfile. Dependency versions are unchanged.
- Actual `npm run dev` and `npm run preview` startup checked in Chromium. Development loads the dense fixture on request; production ignores its query and excludes its unique content from the bundle.
- Chromium at 1440 x 900, 1024 x 768, 390 x 844, and 320 x 480: deep Semantic Zoom, breadcrumb restoration, wheel entry/exit, all three complete workflows, one signal per step, native animation duration, replay/close, manual detours, switching, keyboard access, and reduced motion. No console errors or React Flow warnings observed.
- All four Inspector examples checked at all four sizes, including direct access with no/other/same selection, touch emulation, focus restoration, stable action spacing, and exact camera/selection preservation. Upload workflow inspection checked in Preview and Waiting at desktop, laptop, and 390 px mobile.
- The exact README walkthrough and reset verified at 1440 x 900 and 1024 x 768. A desktop browser recording and representative hierarchy screenshots were captured locally.

Narrow 320 x 480 screens need panning for tall groups; controls can cover part of a card until panned into view. Crossings remain in aggregate Cloud/Editor routes. Physical trackpads, real touch hardware, screen readers, and non-Chromium browsers were not validated.
