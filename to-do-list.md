# Build Plan — History Spider-Web Explorer

A step-by-step build plan derived from `proposal.md`. Each step is self-contained and verifiable. Complete steps in order; check the box when the "Done when" condition is met.

---

## Phase 0 — Project scaffolding & tooling

- [ ] **Step 0.1 — Init project**
  - Scaffold a Vue 3 + Vite app (JavaScript, **no TypeScript**) in the repo root.
  - Use **npm** only. Commit the generated `package-lock.json`.
  - Add `.nvmrc` containing `20` and `"engines": { "node": ">=18" }` to `package.json`.
  - **Done when:** `npm install` succeeds and `npm run dev` serves the default page.

- [ ] **Step 0.2 — Dependencies**
  - Add `@vue-flow/core` (and any Vue Flow addons you need, e.g. background/controls), plus `dagre` for auto-layout.
  - **Done when:** deps install cleanly and import without errors.

- [ ] **Step 0.3 — Folder skeleton**
  - Create the structure from the proposal: `/src/components`, `/src/data/narrations`, `/src/composables`, `/src/utils`, `/scripts`.
  - Add empty placeholder files (`StartScreen.vue`, `GraphCanvas.vue`, `DetailPanel.vue`, `NodeCard.vue`, `Legend.vue`, `useNarration.js`, `useGraphLayout.js`, `nodeId.js`, `validateNarration.js`).
  - **Done when:** structure matches the "File Structure" section of `proposal.md`.

---

## Phase 1 — Data model & utilities (build before UI)

- [ ] **Step 1.1 — `nodeId.js` util**
  - Export `NODE_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*::[a-z0-9]+(?:-[a-z0-9]+)*$/`.
  - Export helpers: `isValidNodeId(id)`, `parseNodeId(id) -> { slug, localId }`, `buildNodeId(slug, localId)`.
  - **Done when:** the valid/invalid examples in the proposal all classify correctly.

- [ ] **Step 1.2 — Sample narration JSON**
  - Author `/src/data/narrations/alexander-rules-world.json` following the narration schema.
  - Use the proposal's worked-example shape (10 nodes): root with 3 children, a convergence node (`n006`, 2 parents, ≤2 children), ≥1 leaf (`children: []`), at least one `causal` and one `consequence` edge, one node per factuality type, ≥1 node with `sources`, ≥1 with `consequences`, and one `crossLinks` entry → `napoleon-wins-waterloo::n001`.
  - **Done when:** file parses as JSON and contains 8–12 nodes meeting every "Sample Content" bullet.

- [ ] **Step 1.3 — `index.json`**
  - Create `/src/data/index.json` listing the one narration (slug, title, file, rootNodeIds).
  - **Done when:** matches the index schema in the proposal.

---

## Phase 2 — Validator (gate before UI work proceeds)

- [ ] **Step 2.1 — `scripts/validateNarration.js`**
  - Load every file in `/src/data/narrations/` and enforce all 5 structural laws:
    1. Out-degree limits (root 2–3; simple/consequence ≤2; 0 allowed for non-root).
    2. In-degree unrestricted (no check needed — just don't reject convergence).
    3. Valid DAG (no cycles), every `children[].targetId` resolves in-narration; every `crossLinks[].targetNodeId` matches `NODE_ID_REGEX` (need not resolve).
    4. `narration` === file slug; `id` matches regex; id-slug === `narration`.
    5. `children[].edgeType` ∈ {`causal`,`consequence`}; node map key === node `id`.
  - Print clear per-error output (node id + rule violated); exit non-zero on any failure.
  - Wire `npm run validate` in `package.json`.
  - **Done when:** `npm run validate` passes on the sample and fails (with clear message) when you intentionally break a rule.

---

## Phase 3 — Narration loading & state composable

- [ ] **Step 3.1 — `useNarration.js`**
  - Load index + a chosen narration JSON.
  - Track `visitedNodeIds` and `expandedNodeIds`; expose `expandNode(id)`, `visitNode(id)`, `isExpanded(id)`, `isLeaf(id)`.
  - **Done when:** expanding the root returns its 3 children; expanding a leaf is a no-op.

- [ ] **Step 3.2 — LocalStorage persistence**
  - Persist state under `history-explorer:state:{slug}`; restore on load.
  - **Done when:** reloading the page restores the previously expanded subgraph.

---

## Phase 4 — Graph canvas

- [ ] **Step 4.1 — `useGraphLayout.js`**
  - Dagre-based layout that positions only currently-expanded nodes (lazy subtree rendering); honor optional `position` hints.
  - **Done when:** expanded nodes lay out without overlap.

- [ ] **Step 4.2 — `NodeCard.vue` (custom node)**
  - Visual distinction for `type` (root larger/distinct) and `factuality` color coding.
  - Visited marker (checkmark/dimmed). **Leaf nodes show no expand affordance**; expandable non-leaf nodes do.
  - **Done when:** root, simple, consequence, each factuality, visited, and leaf all render distinctly.

- [ ] **Step 4.3 — `GraphCanvas.vue`**
  - Render root(s) first; click unexpanded → reveal `children` (animate in) + open detail panel; click expanded → just (re)open panel; click leaf → only open panel.
  - Edge styling by type: `causal` (solid), `consequence` (distinct color/arrow), `cross-narration` from `crossLinks` (dashed). Pan/zoom enabled.
  - **Done when:** all click behaviors and the 3 edge styles render correctly.

---

## Phase 5 — Detail panel, legend, start screen

- [ ] **Step 5.1 — `DetailPanel.vue`**
  - Title, factuality badge, summary bullets, clickable sources, cross-link preview cards ("Coming soon" placeholder when target not loaded), and a collapsible "!" Consequences section.
  - **Done when:** every field of a node renders, and the Consequences toggle works.

- [ ] **Step 5.2 — `Legend.vue`**
  - Legend covering node types, factuality colors, and the 3 edge styles.
  - **Done when:** legend matches the actual canvas styling.

- [ ] **Step 5.3 — `StartScreen.vue` + `App.vue` wiring**
  - Cards from `index.json`; selecting one loads the narration and renders root node(s).
  - **Done when:** full flow works: start screen → pick narration → explore → detail panel.

---

## Phase 6 — Docs & final verification

- [ ] **Step 6.1 — `README.md`**
  - Explain: how to add a narration, the node/edge schema (incl. `edgeType` and the ID regex), how to run the validator, and how cross-narration links will work with a 2nd narration. Document npm + Node 20.
  - **Done when:** a new contributor could add a valid narration using only the README.

- [ ] **Step 6.2 — End-to-end check**
  - Run `npm install`, `npm run validate`, `npm run dev`, `npm run build` from clean.
  - Manually verify: convergence node shows 2 incoming edges; leaf has no expand affordance; cross-link shows "Coming soon"; reload restores state.
  - **Done when:** all four commands succeed and all manual checks pass.
