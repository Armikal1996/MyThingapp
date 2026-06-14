# Build Plan — History Spider-Web Explorer

A step-by-step build plan derived from `proposal.md`. Each step is self-contained and verifiable. Complete steps in order; check the box when the "Done when" condition is met.

---

## Phase 0 — Project scaffolding & tooling

- [x] **Step 0.1 — Init project**
  - Scaffold a Vue 3 + Vite app (JavaScript, **no TypeScript**) in the repo root.
  - Use **npm** only. Commit the generated `package-lock.json`.
  - Add `.nvmrc` containing `20` and `"engines": { "node": ">=18" }` to `package.json`.
  - **Done when:** `npm install` succeeds and `npm run dev` serves the default page.

- [x] **Step 0.2 — Dependencies**
  - Add `@vue-flow/core` (and any Vue Flow addons you need, e.g. background/controls), plus `dagre` for auto-layout.
  - **Done when:** deps install cleanly and import without errors.

- [x] **Step 0.3 — Folder skeleton**
  - Create the structure from the proposal: `/src/components`, `/src/data/narrations`, `/src/composables`, `/src/utils`, `/scripts`.
  - Add empty placeholder files (`StartScreen.vue`, `GraphCanvas.vue`, `DetailPanel.vue`, `NodeCard.vue`, `Legend.vue`, `useNarration.js`, `useGraphLayout.js`, `nodeId.js`, `validateNarration.js`).
  - **Done when:** structure matches the "File Structure" section of `proposal.md`.

---

## Phase 1 — Data model & utilities (build before UI)

- [x] **Step 1.1 — `nodeId.js` util**
  - Export `NODE_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*::[a-z0-9]+(?:-[a-z0-9]+)*$/`.
  - Export helpers: `isValidNodeId(id)`, `parseNodeId(id) -> { slug, localId }`, `buildNodeId(slug, localId)`.
  - **Done when:** the valid/invalid examples in the proposal all classify correctly.

- [x] **Step 1.2 — Sample narration JSON**
  - Author `/src/data/narrations/alexander-rules-world.json` following the narration schema.
  - Use the proposal's worked-example shape (10 nodes): root with 3 children, a convergence node (`n006`, 2 parents, ≤2 children), ≥1 leaf (`children: []`), at least one `causal` and one `consequence` edge, one node per factuality type, ≥1 node with `sources`, ≥1 with `consequences`, and one `crossLinks` entry → `napoleon-wins-waterloo::n001`.
  - **Done when:** file parses as JSON and contains 8–12 nodes meeting every "Sample Content" bullet.

- [x] **Step 1.3 — `index.json`**
  - Create `/src/data/index.json` listing the one narration (slug, title, file, rootNodeIds).
  - **Done when:** matches the index schema in the proposal.

---

## Phase 2 — Validator (gate before UI work proceeds)

- [x] **Step 2.1 — `scripts/validateNarration.js`**
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

- [x] **Step 3.1 — `useNarration.js`**
  - Load index + a chosen narration JSON.
  - Track `visitedNodeIds` and `expandedNodeIds`; expose `expandNode(id)`, `visitNode(id)`, `isExpanded(id)`, `isLeaf(id)`.
  - **Done when:** expanding the root returns its 3 children; expanding a leaf is a no-op.

- [x] **Step 3.2 — LocalStorage persistence**
  - Persist state under `history-explorer:state:{slug}`; restore on load.
  - **Done when:** reloading the page restores the previously expanded subgraph.

---

## Phase 4 — Graph canvas

- [x] **Step 4.1 — `useGraphLayout.js`**
  - Dagre-based layout that positions only currently-expanded nodes (lazy subtree rendering); honor optional `position` hints.
  - **Done when:** expanded nodes lay out without overlap.

- [x] **Step 4.2 — `NodeCard.vue` (custom node)**
  - Visual distinction for `type` (root larger/distinct) and `factuality` color coding.
  - Visited marker (checkmark/dimmed). **Leaf nodes show no expand affordance**; expandable non-leaf nodes do.
  - **Done when:** root, simple, consequence, each factuality, visited, and leaf all render distinctly.

- [x] **Step 4.3 — `GraphCanvas.vue`**
  - Render root(s) first; click unexpanded → reveal `children` (animate in) + open detail panel; click expanded → just (re)open panel; click leaf → only open panel.
  - Edge styling by type: `causal` (solid), `consequence` (distinct color/arrow), `cross-narration` from `crossLinks` (dashed). Pan/zoom enabled.
  - **Done when:** all click behaviors and the 3 edge styles render correctly.

---

## Phase 5 — Detail panel, legend, start screen

- [x] **Step 5.1 — `DetailPanel.vue`**
  - Title, factuality badge, summary bullets, clickable sources, cross-link preview cards ("Coming soon" placeholder when target not loaded), and a collapsible "!" Consequences section.
  - **Done when:** every field of a node renders, and the Consequences toggle works.

- [x] **Step 5.2 — `Legend.vue`**
  - Legend covering node types, factuality colors, and the 3 edge styles.
  - **Done when:** legend matches the actual canvas styling.

- [x] **Step 5.3 — `StartScreen.vue` + `App.vue` wiring**
  - Cards from `index.json`; selecting one loads the narration and renders root node(s).
  - **Done when:** full flow works: start screen → pick narration → explore → detail panel.

---

## Phase 6 — Docs & final verification

- [x] **Step 6.1 — `README.md`**
  - Explain: how to add a narration, the node/edge schema (incl. `edgeType` and the ID regex), how to run the validator, and how cross-narration links will work with a 2nd narration. Document npm + Node 20.
  - **Done when:** a new contributor could add a valid narration using only the README.

- [x] **Step 6.2 — End-to-end check**
  - Run `npm install`, `npm run validate`, `npm run dev`, `npm run build` from clean.
  - Manually verify: convergence node shows 2 incoming edges; leaf has no expand affordance; cross-link shows "Coming soon"; reload restores state.
  - **Done when:** all four commands succeed and all manual checks pass.

---

## Phase 7 — Predict-then-Reveal Overhaul

- [x] **Step 7.1 — Schema, validator, and docs**
  - Add optional `prediction`, `theme`, and `narrator` metadata.
  - Extend `scripts/validateNarration.js` and README documentation.
  - **Done when:** old narrations still validate, and prediction nodes are checked.

- [x] **Step 7.2 — Theming system**
  - Add per-era theme variables and apply them to the explorer.
  - **Done when:** Alexander and Marx use distinct visual themes.

- [x] **Step 7.3 — Game core**
  - Add game plugin and composable for score, streak, badges, answered predictions, and research mode.
  - **Done when:** game state persists per narration.

- [x] **Step 7.4 — New game components**
  - Add Prediction Overlay, Game HUD, Narrator Bubble, and Badge Toast.
  - **Done when:** kids mode can ask a prediction before revealing a branch.

- [x] **Step 7.5 — Rework existing flow**
  - Route node clicks through kids/research mode, preserve branch collapse, and show story cards.
  - **Done when:** kids mode predicts before reveal; research mode skips prediction.

- [x] **Step 7.6 — Sample prediction content**
  - Add narrator/theme metadata and sample authored predictions for Alexander and Marx.
  - **Done when:** `npm run validate` and `npm run build` pass.

---

## Phase 8 — Fun + Meaning Improvements

- [x] **Step 8.1 — Prediction coverage**
  - Add prediction support for more important branches, with a fallback for branching nodes that do not yet have authored questions.
  - **Done when:** important branches prompt the user to think before reveal.

- [x] **Step 8.2 — History Power-Ups**
  - After reveal, show a short reward explaining what historical skill/idea the player just learned.
  - **Done when:** story cards include a visible power-up reward.

- [x] **Step 8.3 — Difficulty levels**
  - Add Easy / Hard prediction difficulty using the existing game system.
  - **Done when:** the user can switch difficulty and predictions adapt.

- [x] **Step 8.4 — Mission paths**
  - Add mission goals like "Trace Alexander's empire roads" or "Follow Marxism into state power."
  - **Done when:** the app shows mission progress from discovered nodes.

- [x] **Step 8.5 — End-of-branch recaps**
  - When a leaf node is reached, show the path taken and suggest trying another branch.
  - **Done when:** leaf story cards include a path recap.

- [x] **Step 8.6 — Verification**
  - Run validation, build, and lints.
  - **Done when:** all checks pass and this section is marked complete.

---

## Phase 9 — Web-Shaped Narration + Better Branching

- [ ] **Step 9.1 — Define narrative branching rules**
  - Update the narration authoring rules so most non-leaf story nodes should have **2 children**: one "left" answer and one "right" answer.
  - Use 1 child only for bridge nodes, recaps, book/reference nodes, or when history genuinely has only one necessary next step.
  - Keep 0 children for true endings only.
  - Keep the root at 2–3 children so a narration can start with a broad choice.
  - **Done when:** the README/template explain when to use 0, 1, 2, or 3 children.

- [ ] **Step 9.2 — Add branch intent to JSON**
  - Extend child edges with optional `branchSide` (`left`, `right`, `center`) and `branchLabel` fields.
  - Example: one child can be `branchSide: "left", branchLabel: "Body path"` and the other `branchSide: "right", branchLabel: "Mind path"`.
  - Keep `edgeType` for meaning (`causal` / `consequence`); use `branchSide` only for layout and visual shape.
  - **Done when:** validator accepts optional `branchSide` and rejects invalid values.

- [ ] **Step 9.3 — Add narrative balance checks**
  - Add validator warnings, not hard errors, for narrations that become too one-sided.
  - Warn when more than about 60% of expandable non-root nodes have only 1 child.
  - Warn when a path gets very long without a split, because that creates a boring "click straight down" chain.
  - **Done when:** `npm run validate` still passes valid narrations but prints helpful authoring warnings.

- [ ] **Step 9.4 — Update AI narration template**
  - Update `templates/template.json` to ask third-party AIs for a wider web: most important decision nodes should offer 2 meaningful children.
  - Require the two answers to feel meaningfully different, not just "correct vs silly."
  - Encourage convergences where two paths later meet again, so the graph feels like a web instead of isolated branches.
  - **Done when:** the template gives a clear example of left/right branches that later converge.

- [ ] **Step 9.5 — Improve graph layout**
  - Update `useGraphLayout.js` so `branchSide` influences placement: left branches lean left, right branches lean right, center branches stay near the trunk.
  - Increase horizontal spacing for large narrations and reduce the long vertical "ladder" feeling.
  - Preserve pan/zoom and avoid overlap.
  - **Done when:** the physiology narration spreads left and right instead of mostly forming one tall column.

- [ ] **Step 9.6 — Add branch choice UI clarity**
  - Show small edge or node labels for branch meaning, such as "Body", "Mind", "Experiment", "Theory", "School", or "Technology".
  - In prediction questions, make the two main options map clearly to the two revealed branches.
  - Use child-friendly wording for kids mode and factual wording for research mode.
  - **Done when:** users can understand why choosing left vs right matters.

- [ ] **Step 9.7 — Rework physiology narration shape**
  - Edit `history-of-physiology-and-psychology.json` so major nodes branch more evenly into body/mind, experiment/theory, books/discoveries, and technology/ideas.
  - Add or adjust convergence nodes where related paths meet again.
  - Avoid fake choices: every branch should teach a real historical direction.
  - **Done when:** the graph has a more playful web shape while staying factual.

- [ ] **Step 9.8 — Verify web-shaped experience**
  - Run `npm run validate` and `npm run build`.
  - Manually inspect all three narrations, especially physiology, for left/right spread and readable branch labels.
  - **Done when:** validation/build pass and the graph feels like an explorable web, not a one-sided answer chain.

---

## Phase 10 — Narration Studio (AI generation helper)

- [x] **Step 10.1 — In-browser validator**
  - Add `src/utils/narrationValidator.js` mirroring `scripts/validateNarration.js`, returning `{ errors, warnings, stats }` (web-shape warnings included).
  - **Done when:** pasted JSON is checked against the same structural laws used by `npm run validate`.

- [x] **Step 10.2 — Prompt builder**
  - Add `src/utils/narrationPromptBuilder.js` that turns a topic + headers into a complete AI prompt embedding all schema rules, web-shape guidance, a canonical example, and the style/slugs of existing narrations.
  - **Done when:** the prompt is self-contained and avoids reusing existing slugs.

- [x] **Step 10.3 — Narration Studio modal**
  - Add `src/components/NarrationStudio.vue` with a 3-step flow: Describe → copy Prompt → paste JSON, validate, download `.json` + copy the `index.json` snippet.
  - **Done when:** a valid pasted narration can be downloaded and registered.

- [x] **Step 10.4 — Top-bar entry point**
  - Add a "Create narration with AI" button to the Start Screen top bar that opens the studio and passes the existing narrations list.
  - **Done when:** the button opens the studio and the build passes.
