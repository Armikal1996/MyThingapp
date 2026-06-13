# History Spider-Web Explorer

An interactive history exploration app built with Vue 3 + Vue Flow. Users click nodes representing historical events; the web expands with connected nodes (children/causes/consequences), and a detail panel shows rich information about each node.

## Requirements

- **Node ≥ 18** (developed on Node 20 LTS, see `.nvmrc`)
- **npm** — do not use yarn/pnpm/bun

## Quick Start

```bash
npm install
npm run dev        # development server
npm run build      # production build
npm run validate   # validate all narration JSON files
```

---

## How to Add a New Narration

1. Create `src/data/narrations/<your-slug>.json` — copy `alexander-rules-world.json` as a template.
2. Register it in `src/data/index.json` by adding an entry to the `narrations` array.
3. Run `npm run validate` — fix any errors it reports before proceeding.
4. Restart the dev server — the narration card will appear on the Start Screen.

---

## Node Schema Reference

Each node in a narration file must conform to the following shape:

```jsonc
{
  "id": "my-narration::n001",          // globally unique; format: slug::local-id
  "narration": "my-narration",          // must match the narration file's slug
  "type": "root | simple | consequence",
  "title": "Short display title",
  "summary": "One or two sentences shown in the detail panel.",
  "factuality": "historical | speculative | alternate",
  "sources": [                          // optional; can be []
    { "label": "Book or URL title", "url": "https://..." }
  ],
  "consequences": "Text shown when the '!' button is clicked. Optional/null.",
  "children": [                         // outgoing edges — OBJECTS, not plain strings
    { "targetId": "my-narration::n002", "edgeType": "causal | consequence" }
  ],
  "crossLinks": [                       // references to nodes in OTHER narrations; optional
    { "targetNodeId": "other-narration::n001", "label": "Display label" }
  ],
  "position": { "x": 100, "y": 200 }   // optional layout hint; omit to use auto-layout
}
```

### Node ID Format

```
NODE_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*::[a-z0-9]+(?:-[a-z0-9]+)*$/
```

- Lowercase alphanumeric words separated by single hyphens, joined by `::`
- Valid: `alexander-rules-world::n001`, `napoleon-wins-waterloo::battle-2`
- Invalid: `Alex::N001` (uppercase), `alex::` (empty local id), `alex--rules::n001` (double hyphen)

### Edge Types (`children[].edgeType`)

| Value | Meaning | Canvas style |
|---|---|---|
| `causal` | This event caused / led to the target | Solid gray arrow |
| `consequence` | The target is a downstream consequence | Dashed orange arrow |

Cross-narration links (via `crossLinks`) are always rendered with a dashed purple edge — the type is implicit.

### Factuality Colors

| Value | Meaning | Color |
|---|---|---|
| `historical` | Based on real documented events | Green |
| `speculative` | Plausible extrapolation | Blue |
| `alternate` | Counterfactual / "what if" | Purple |

### Node Types

| Value | Description | Out-degree rule |
|---|---|---|
| `root` | Starting point of the narration | Must have 2–3 children |
| `simple` | A historical event | At most 2 children (0 = leaf) |
| `consequence` | A downstream effect | At most 2 children (0 = leaf) |

**Important — out-degree vs. in-degree:** The child limits above are *outgoing edges only*. A node may have any number of *incoming* edges (parents). Convergence points — nodes with 2+ parents — are fully valid.

---

## Validator

```bash
npm run validate
```

Checks all files in `src/data/narrations/` against five structural laws:

1. **Out-degree limits** — root: 2–3 children; simple/consequence: ≤2; leaf (0 children) always valid.
2. **In-degree unrestricted** — convergence points are expected and allowed.
3. **Valid DAG** — no cycles; every `children[].targetId` resolves within the same narration; every `crossLinks[].targetNodeId` matches the ID regex (need not resolve to an existing narration yet).
4. **ID consistency** — `id` matches `NODE_ID_REGEX`, `narration` field matches file slug, id-slug portion matches `narration`.
5. **Edge schema** — `children[].edgeType` must be `causal` or `consequence`; map keys must equal node `id`.

Exits with code 0 on pass, code 1 on any failure, with per-error messages.

---

## Cross-Narration Links

`crossLinks` allow a node in one narration to reference a node in another. Currently these links:

- Appear on the canvas as dashed purple edges pointing to a ghost "Coming Soon" node.
- Appear in the detail panel as preview cards with a "Coming Soon" indicator.

**When a second narration exists:** add the narration file and register it in `index.json`. The cross-link UI will automatically enable once you implement the lookup in `useNarration.js` — the composable exposes `allNodes` per-narration and the `crossLinks[].targetNodeId` field is already stored; you just need a multi-narration store to resolve it.

---

## Project Structure

```
src/
  components/
    StartScreen.vue      — narration selection cards
    GraphCanvas.vue      — Vue Flow canvas, edge styling, node clicks
    NodeCard.vue         — custom Vue Flow node (history nodes)
    CrossLinkNode.vue    — custom Vue Flow node (ghost cross-link nodes)
    DetailPanel.vue      — side panel: title, factuality, sources, consequences, cross-links
    Legend.vue           — collapsible legend overlay
  composables/
    useNarration.js      — load narration, expand/visit state, LocalStorage persistence
    useGraphLayout.js    — dagre layout helper
  data/
    index.json           — list of all narrations
    narrations/
      alexander-rules-world.json
  utils/
    nodeId.js            — NODE_ID_REGEX, parse/build helpers
  App.vue                — top-level routing (start screen ↔ explorer)
  main.js                — app entry point
scripts/
  validateNarration.js   — CLI validator (npm run validate)
```

## Tech Stack

- Vue 3 (Composition API, JavaScript)
- Vite 6
- @vue-flow/core 1.x — graph canvas
- dagre — auto-layout
- LocalStorage — state persistence (no backend)
