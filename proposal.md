# Build Prompt for Claude Code (Opus)

## Project Overview
Build a Vue.js (JavaScript, NOT TypeScript) single-page app: an interactive "spider-web" history exploration game/research tool. Users click nodes representing historical events; the web expands with connected nodes (children/causes/consequences), and a detail panel shows information about the clicked node. The system must support a DAG (directed acyclic graph) structure, optional sourcing/citations, factuality flags, and future support for "alternate universe" narrations and cross-narration links.

## Tech Stack
- Vue 3 (Composition API, Options API is fine too — your call), JavaScript only, no TypeScript
- Vite for build tooling
- **Vue Flow** (`@vue-flow/core`) for the node graph/web visualization, with dagre or force-directed auto-layout
- Plain CSS or a lightweight utility approach (no heavy UI framework needed)
- LocalStorage for save state (visited/expanded nodes)
- No backend — all content loaded from local JSON files

## Data Architecture

Create `/src/data/narrations/` with one JSON file per narration (start with one: `alexander-rules-world.json`). Also create `/src/data/index.json` listing all narrations and their starting node(s).

### Global Node ID convention
`narration-slug::node-id` (e.g., `alexander-rules-world::n001`) — even though only one narration exists now, use this format everywhere so cross-narration linking works later without refactoring.

### Node schema (JSON Schema, also implement as a validator script)
Each node has:
- `id` (string, globally unique using the slug::id convention)
- `narration` (string, slug of owning narration)
- `type`: `"root" | "simple" | "consequence"` 
- `title` (string)
- `summary` (string, short bullet-friendly description for the detail panel)
- `factuality`: `"historical" | "speculative" | "alternate"`
- `sources`: array of `{ label: string, url: string }` (optional, can be empty array)
- `consequences`: string (text shown when "!" button clicked — explains the node's significance and/or what clicking it implies for the timeline). Optional/nullable.
- `children`: array of node IDs (outgoing edges to child nodes)
- `crossLinks`: array of `{ targetNodeId: string, label: string }` (optional, references to nodes in OTHER narrations)
- `position`: optional `{x, y}` hint for layout (can be omitted if using auto-layout)

### Narration file schema
```json
{
  "slug": "alexander-rules-world",
  "title": "Adult Alexander the Great Rules the World",
  "version": 1,
  "description": "...",
  "rootNodeIds": ["alexander-rules-world::n001"],
  "nodes": { "alexander-rules-world::n001": { ...node }, ... }
}
```

### Index file schema (`/src/data/index.json`)
```json
{
  "narrations": [
    { "slug": "alexander-rules-world", "title": "...", "file": "alexander-rules-world.json", "rootNodeIds": [...] }
  ]
}
```

## Structural "Laws" to Enforce (via validator script)
1. Root/start nodes (`type: "root"`) may have 2–3 children.
2. Simple nodes (`type: "simple"` or `"consequence"`) may have at most 2 children.
3. The graph per narration must be a valid DAG — no cycles, all `children` and `crossLinks` IDs must resolve to nodes that exist (cross-links can point to other narration files).
4. Every node's `narration` field must match the file it's contained in, and its `id` prefix must match `narration::`.

Write this validator as `/scripts/validateNarration.js` (Node script, run via `npm run validate`), checked against all files in `/src/data/narrations/`. It should print clear errors with node IDs and rule violated.

## Gameplay / UI Requirements

### Landing/Start Screen
- Show all available starting points (from `index.json`), e.g., as cards: "Adult Alexander the Great Rules the World"
- Clicking a starting point loads that narration and renders its root node(s) on the Vue Flow canvas

### Web/Graph Canvas (Vue Flow)
- Root node(s) rendered first, visually distinct (larger, different color/shape) from simple/consequence nodes
- Clicking an unexpanded node: reveals its `children` as new connected nodes on the canvas (animate in), AND opens the detail panel for that node
- Already-expanded nodes: clicking again just opens/refreshes the detail panel (doesn't re-add children)
- Visual distinction for node types: root vs. simple vs. consequence, and for `factuality`: historical vs. speculative vs. alternate (use color coding — define a small legend)
- Pan/zoom enabled; lazy-render only expanded subtrees (don't render the whole narration graph upfront if it's large)
- Edge types: causal vs. consequence vs. cross-narration — style edges differently (e.g., dashed for cross-narration)

### Detail Panel (side panel, opens on node click)
- Title, factuality badge (colored label: Historical / Speculative / Alternate)
- Summary as a short bullet list
- Sources list (if any) as clickable links
- If `crossLinks` exist: render small "preview cards" with target node's title (you can pull title from a lookup; for now if the target narration isn't loaded, show the label text and a placeholder "Coming soon" instead of a working jump — but keep the UI ready for it)
- A "!" button labeled "Consequences" — clicking it expands/shows the `consequences` text within the panel (collapsible section)

### State / Persistence
- Track `visitedNodeIds` and `expandedNodeIds` in LocalStorage per narration (key like `history-explorer:state:{slug}`)
- On reload, restore which nodes were expanded and re-render that subgraph
- Visited nodes get a subtle visual marker (e.g., checkmark or dimmed border) distinct from unvisited

## Sample Content
Populate `alexander-rules-world.json` with a small but complete sample DAG (8–12 nodes) demonstrating:
- 1 root node with 3 children
- At least one node with 2 children (max allowed for simple nodes)
- At least one convergence point (a node with 2 parents)
- At least one node of each factuality type (historical, speculative, alternate)
- At least one node with populated `sources`
- At least one node with a non-empty `consequences` field
- At least one `crossLinks` entry (pointing to a placeholder node ID in a narration that doesn't exist yet, e.g., `napoleon-wins-waterloo::n001`, to demonstrate the "Coming soon" cross-link UI)

## File Structure (suggested)
```
/src
  /components
    StartScreen.vue
    GraphCanvas.vue
    DetailPanel.vue
    NodeCard.vue (custom Vue Flow node component)
    Legend.vue
  /data
    index.json
    /narrations
      alexander-rules-world.json
  /composables
    useNarration.js   (loading, expanding, state persistence)
    useGraphLayout.js (dagre layout helpers)
  /utils
    nodeId.js (parsing/building narration::id strings)
  App.vue
  main.js
/scripts
  validateNarration.js
```

## Deliverables
1. Working Vite + Vue 3 app, `npm run dev` runs it
2. Sample narration JSON with 8-12 nodes meeting the criteria above
3. `npm run validate` script that checks structural laws and reports pass/fail
4. README.md explaining: how to add a new narration, how the node schema works, how to run the validator, and how cross-narration links will work once a second narration exists

## Notes on Style
- Keep components small and composable; this will grow to many narrations and node types
- Comment the data schema thoroughly in the README since content will be AI-generated later and must conform to it
- Don't over-engineer the alternate-universe visual system yet — just make sure the `factuality` field and color-coding exist so it's easy to extend