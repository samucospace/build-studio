# Build Studio

Build Studio is a browser-based 3D brick sandbox built with Three.js and Vite.

You can place, select, erase, rotate, and move a large catalog of procedural brick-like pieces, then export and import builds as JSON.

## Highlights

- Three.js real-time 3D scene with orbit camera controls
- Procedural brick catalog with many piece families:
  - Core bricks
  - Plates
  - Tiles
  - Slopes and wedges
  - Rounded pieces
  - Arches and cylinders
  - Decorative pieces (including chest and flag variants)
- Searchable, filterable, scrollable brick browser
- Category chips and shape filter
- Live result count and removable active filter badges
- Build, Select, and Erase tools
- Grid snap toggle and free placement mode
- Collision and overlap prevention
- Drag-to-move selected bricks
- Shift-modified vertical drag in Select mode
- Keyboard and touch-friendly controls
- Instanced rendering and geometry/material caching for better performance at higher brick counts
- JSON export and import

## Tech Stack

- TypeScript
- Vite
- Three.js

## Getting Started

Prerequisites:

- Node.js 20+
- npm

Install and run:

1. npm install
2. npm run dev
3. Open http://localhost:5173

Production build:

- npm run build

Preview production build:

- npm run preview

## Controls

### Camera

- Left drag: Orbit
- Right drag: Pan
- Mouse wheel: Zoom

### Build Workflow

- Build mode: Click to place
- Erase mode: Click to erase
- Quick erase: Shift + Click
- Snap toggle: G
- Rotate Y: R
- Rotate X: T
- Rotate Z: F

### Selection and Movement

- Select mode: Click a brick to select
- Drag selected brick: move on X/Z plane
- Shift while dragging: vertical drag (Y)
- Delete selected brick: Delete key
- Nudge movement (best with snap off):
  - Arrow keys for X/Z
  - PageUp/PageDown for Y

### Undo/Redo

- Undo: Ctrl+Z
- Redo: Ctrl+Shift+Z or Ctrl+Y

## UI Notes

- Left panel focuses on piece browsing and color selection
- Help panel is opened from the top-right Help button
- Help panel supports:
  - Tap/click outside to close
  - Escape to close
  - Swipe-right gesture to close on touch devices

## Brick Browser

The brick browser supports layered filtering:

- Text search by name or id
- Category chips
- Shape-family dropdown
- Live result count
- Active filter badges with individual remove buttons

## Save Format

Builds are exported as JSON with the brick list, positions, rotations, color, and type ids.

Import expects the same structure and restores the scene state from file.

## Project Structure

- src/main.ts: App bootstrap and wiring
- src/scene.ts: Three.js scene, camera, lights, render loop
- src/placement.ts: Raycasting, placement, selection, drag, collision, input behavior
- src/bricks.ts: Catalog lookup, procedural geometry, instancing, bounds
- src/ui.ts: UI rendering, filters, badges, help panel, control bindings
- src/persistence.ts: Export/import serialization
- src/constants.ts: Units, rotation step, colors, and catalog definitions
- src/types.ts: Shared TypeScript types

## Performance Notes

- Rendering uses instanced meshes grouped by type and color
- Geometry and material caching reduce allocation churn
- Vite may show a chunk-size warning at build time; this is expected for the current single-bundle setup

## Roadmap / TODO

### Phase 1: Build Quality and Reliability

- Add unit tests for snapping logic and collision checks
- Add integration tests for placement, selection, drag, and erase flows
- Improve import validation and user-facing error messages
- Add autosave and optional recovery prompt on reload

### Phase 2: UX and Editing Workflows

- Add multi-select with box/lasso selection
- Add duplicate and mirror operations for selected bricks
- Add transform gizmo mode for direct move/rotate handles
- Add optional camera presets (top, side, isometric)
- Add quick favorites and recent pieces in the brick browser

### Phase 3: Catalog and Content

- Expand piece set with additional technical/structural parts
- Add piece thumbnails/icons in the browser list
- Add tagging (theme, function, complexity) beyond category/shape
- Add optional piece metadata panel (dimensions, family, usage hints)

### Phase 4: Performance and Scale

- Add LOD strategy for very large scenes
- Optimize picking for large instance counts
- Add optional worker-based heavy operations (import, mass transforms)
- Explore code splitting to reduce initial bundle size

### Phase 5: Sharing and Collaboration

- Add screenshot export from current camera view
- Add shareable build links via compressed scene payload
- Add versioned save schema and migration helpers
- Add optional cloud sync/user profile support

### Backlog Ideas

- Animation mode for simple mechanical motion previews
- Terrain/baseplate presets
- Accessibility pass for contrast and keyboard-only flows
- In-app onboarding tour for first-time users

## License

No license has been added yet. Add a LICENSE file if you intend to distribute or open-source this project.
