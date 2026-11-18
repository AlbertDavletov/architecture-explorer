# Architecture Explorer
## Product Vision & Design Principles

**Architecture Explorer — a living, zoomable map of software architecture.**

### Mission

Make complex software systems easy to understand, explore, and explain.

Architecture Explorer helps developers understand not only how a system is organized, but also how it behaves when something happens.

The experience should remain intuitive regardless of the size or complexity of the underlying architecture.

**Our philosophy: The more complex the system, the simpler it should be to explore.**

---

## 1. Two Core Layers

### Layer 1 — Architecture

**What is the system made of?**

Explore the structure of a software system through a living, zoomable architecture map.

- Discover static components and connections, with directional arrows or chevrons and no continuously moving dots.
- Zoom into components to reveal architectural details.
- Navigate across different levels of abstraction.
- Understand how information generally moves between components.
- Keep the overall picture simple, even for large systems.

### Layer 2 — Workflows

**What happens when a specific action occurs?**

Explore what happens when a specific action or event occurs.

Examples:

- Upload an image.
- Open a document.
- Move an object.
- Save changes.
- Share a document.

A workflow highlights the relevant components and connections while leaving unrelated architecture visible but less prominent. Animated dots appear only on relationships involved in the selected workflow, following its logical execution sequence. Playback ends when the workflow finishes.

Workflows use the same architecture map and Semantic Zoom navigation.

Users can zoom into any part of a workflow to understand what happens inside a component, without losing their place in the scenario.

**One architecture. Multiple ways to understand it.**

---

## 2. Core Principles

### P1 — Simplicity First

Every architectural level should be understandable without specialized engineering knowledge.

Complexity belongs in the underlying system, not in the user interface.

### P2 — Semantic Zoom

Zooming reveals or hides architectural details, not just larger or smaller shapes.

More complexity should result in more levels of abstraction, not more visible nodes.

### P3 — Progressive Disclosure

Show only what is relevant to the current context.

Aggregate unnecessary dependencies. Reveal technical details only when requested.

### P4 — Spatial Continuity

Architecture is one connected space.

Entering a component should feel like moving inside it. Zooming out should naturally restore the parent context.

Preserve orientation, spatial relationships, and navigation history.

### P5 — Canvas-First

The architecture map is the primary interface.

Keep controls minimal. Use compact breadcrumbs and subtle contextual actions.

Avoid dashboards, unnecessary panels, minimaps, excessive labels, and configuration controls.

### P6 — Intuitive Navigation

- Click to select.
- Zoom to explore a selected component.
- Zoom without selection to inspect the current canvas.
- Zoom out to return to the parent architecture.
- Use breadcrumbs to reach ancestors.

Provide useful zoom boundaries and subtle discoverability hints.

### P7 — Living Signals

Motion must have meaning. Architecture shows structure. Traffic shows activity. Workflows show behavior.

Architecture uses static directional connections. Workflows use small animated colored dots to explain a specific execution. Optional future Traffic Awareness can use aggregated signal frequency or density to show activity.

- Blue — requests.
- Green — data and file transfers.
- Orange — events and notifications.

Preserve consistent meanings across all levels and features.

Animations should be smooth, restrained, and easy to follow.

### P8 — Workflows Are Overlays

Workflows do not create separate architecture maps.

They highlight relevant components and connections within the existing architecture.

Unrelated parts of the system become less prominent, without necessarily disappearing.

Closing a workflow restores the normal architecture view.

**A workflow should reveal its path before it starts moving.** Preview its participating components and connections without changing their layout or blocking unrelated exploration.

**Hidden activity should never mean hidden direction.** Distinguish direct participation from activity inside a component, and make the current step discoverable at any level.

### P9 — Show Cause and Effect

A workflow is more than a highlighted path.

It explains the sequence of events that causes an operation to happen.

Support sequential steps, branching, and parallel operations where required.

Do not invent ordering or dependencies that are not supported by the workflow description.

### P10 — Workflows Respect Semantic Zoom

Workflow state and architectural scale are independent.

Zooming changes the amount of detail shown, not the underlying workflow.

The user should be able to explore an operation at different architectural levels while preserving its logical context and progress.

**The user explores the system; the workflow guides, but never takes control.** Follow is an explicit user action. It navigates through the shared hierarchy to the nearest useful context, preserves the current step, and leaves playback paused until the user continues.

### P11 — Traffic Awareness Without Clutter

**How much activity moves through the system?**

Traffic Awareness is an optional future capability of the Architecture layer, not a third core layer. It is not implemented in this iteration. Aggregated traffic intensity can be represented through the frequency or density of animated signals.

Where meaningful, client components may display their share of traffic as a percentage.

Keep the same signal colors and connection styles.

Do not introduce a separate Sankey graph or complex traffic dashboard.

Only present quantitative values when the underlying metric and measurement period are defined.

### P12 — Details on Demand

Keep the main canvas free from low-level technical labels such as GET, POST, AUTH, and protocol names.

Detailed information can be accessed by selecting a component, connection, or workflow step.

### P13 — Architecture and Behavior Are Separate Models

Maintain separate representations for:

- Architectural components and relationships.
- Workflow events, dependencies, and execution order.
- Traffic measurements and their time windows.
- Visual navigation and animation state.

These models should work together without becoming tightly coupled.

### P14 — Explain, Don't Mislead

Clearly distinguish illustrative workflows, inferred interactions, and verified runtime information.

Workflow dots represent a simulated logical execution unless explicitly identified as verified runtime information.

Traffic measurements must not be confused with simulated workflow playback.

### P15 — Scale Without Visual Complexity

The architecture may contain thousands of components and relationships.

Only render and emphasize what is necessary for the current level and selected task.

Optimize for human comprehension rather than displaying the maximum possible information.

---

## 3. Product Experience

A user should be able to:

1. Open an unfamiliar system and understand its main architectural areas.
2. Zoom into any relevant component.
3. See how components communicate.
4. Select a workflow and watch how an operation moves through the architecture.
5. Zoom into a participating component while preserving workflow context.
6. Understand which parts of the system are involved.
7. Inspect technical details when needed.
8. Return to the overall architecture without getting lost.

No advanced training should be required.

## 4. Guiding Rule for New Features

Every proposed feature should answer two questions:

1. Does it make the system easier to understand?
2. Can it be implemented without making the main canvas more complicated?

If it adds visual complexity without improving comprehension, it does not belong in the default experience.

**One canvas. Two core layers. Progressive understanding.**
