// Builds a complete, self-contained prompt that a third-party AI can turn into
// a valid narration JSON for this app. The prompt embeds the schema rules, the
// web-shape branching guidance, a canonical worked example, and the user's
// topic/headers. It is also aware of narrations already in the app so the AI
// keeps the same style and avoids slug/title collisions.

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const CANONICAL_EXAMPLE = `{
  "slug": "example-slug",
  "title": "A Big Historical Question?",
  "version": 1,
  "description": "Player-facing description. Say plainly: historical = evidence, speculative = educated guess, alternate = what-if.",
  "theme": { "era": "archive", "accent": "#f59e0b", "accent2": "#38bdf8", "motif": "maps, notes, instruments" },
  "narrator": {
    "name": "Guide Name",
    "persona": "curious time-guide",
    "intro": "Read the clue, make a brave guess, then reveal the branch.",
    "correctLines": ["Correct! You spotted the clue.", "Nice historical thinking."],
    "wrongLines": ["Good guess, but history took another path.", "Not quite. Test the next clue."]
  },
  "rootNodeIds": ["example-slug::root"],
  "missions": [
    { "id": "mission-main", "title": "Mission Title", "description": "What the player traces.", "nodeIds": ["example-slug::root", "example-slug::left-1", "example-slug::merge"] }
  ],
  "nodes": {
    "example-slug::root": {
      "id": "example-slug::root",
      "narration": "example-slug",
      "type": "root",
      "title": "Root Event or Big Question",
      "summary": "Line 1: scene with a real date, place, person.\\nLine 2: why it matters.\\nLine 3: a kid-friendly guess prompt.",
      "factuality": "historical",
      "sources": [{ "label": "Reliable source", "url": "https://example.com" }],
      "consequences": "Why this root matters.",
      "children": [
        { "targetId": "example-slug::left-1", "edgeType": "causal", "branchSide": "left", "branchLabel": "Body path" },
        { "targetId": "example-slug::right-1", "edgeType": "causal", "branchSide": "right", "branchLabel": "Mind path" }
      ],
      "prediction": {
        "question": "What do you think happens next?",
        "choices": [
          { "id": "c1", "text": "Plausible correct step.", "correct": true, "feedback": "Why it is correct.", "leadsTo": "example-slug::left-1" },
          { "id": "c2", "text": "Tempting but wrong.", "correct": false, "feedback": "Why it is tempting but wrong." }
        ]
      },
      "powerUp": { "title": "Skill Name", "text": "One sentence about the thinking skill learned." },
      "crossLinks": []
    },
    "example-slug::left-1": {
      "id": "example-slug::left-1",
      "narration": "example-slug",
      "type": "simple",
      "title": "Left Branch",
      "summary": "Factual, short lines.",
      "factuality": "historical",
      "sources": [],
      "consequences": "What this branch changes.",
      "children": [ { "targetId": "example-slug::merge", "edgeType": "causal", "branchSide": "center" } ],
      "powerUp": { "title": "Evidence Radar", "text": "You connected a claim to evidence." },
      "crossLinks": []
    },
    "example-slug::right-1": {
      "id": "example-slug::right-1",
      "narration": "example-slug",
      "type": "simple",
      "title": "Right Branch",
      "summary": "A plausible extrapolation; mark what is known vs guessed.",
      "factuality": "speculative",
      "sources": [],
      "consequences": "Why this speculation matters.",
      "children": [ { "targetId": "example-slug::merge", "edgeType": "causal", "branchSide": "center" } ],
      "powerUp": { "title": "Careful What-If", "text": "You separated evidence from possibility." },
      "crossLinks": []
    },
    "example-slug::merge": {
      "id": "example-slug::merge",
      "narration": "example-slug",
      "type": "consequence",
      "title": "Convergence Point",
      "summary": "Two parents (left-1 and right-1) meet here, showing different causes leading to one result.",
      "factuality": "speculative",
      "sources": [],
      "consequences": "What the convergence teaches.",
      "children": [],
      "powerUp": { "title": "Convergence Clue", "text": "Different causes can lead to the same result." },
      "crossLinks": []
    }
  }
}`

/**
 * @param {object} input
 * @param {string} input.topic         Main subject / big question.
 * @param {string} input.slug          Target slug (lowercase-hyphen).
 * @param {string} input.title         Player-facing title.
 * @param {string[]} input.headers     Section/header beats to cover.
 * @param {string} [input.audience]    Audience note (default kids 9–13 + researchers).
 * @param {number} [input.targetNodes] Rough node count target.
 * @param {string} [input.narratorName]
 * @param {Array<{slug:string,title:string}>} [input.existingNarrations]
 * @returns {string} the full prompt text
 */
export function buildNarrationPrompt(input) {
  const {
    topic = '',
    slug = '',
    title = '',
    headers = [],
    audience = 'Children aged 9–13 first, but also useful for researchers.',
    targetNodes = 24,
    narratorName = '',
    existingNarrations = []
  } = input

  const headerLines = headers.filter(Boolean).length
    ? headers.filter(Boolean).map((h, i) => `  ${i + 1}. ${h}`).join('\n')
    : '  (No specific headers given — choose the most important historical beats yourself.)'

  const existingList = existingNarrations.length
    ? existingNarrations.map(n => `  - "${n.title}" (slug: ${n.slug})`).join('\n')
    : '  (none yet)'

  const existingSlugs = existingNarrations.map(n => n.slug)

  return `You are generating ONE narration file for an educational history-web app called "Time Web Academy".
The app shows a branching web of history nodes. Players READ a clue, GUESS what happens next, then REVEAL the branch.

============================================================
THE TASK
============================================================
Topic / big question: ${topic || '(fill in based on the title)'}
Player-facing title:  ${title || '(write a curious, kid-friendly question title)'}
Slug (must use EXACTLY): ${slug || '(lowercase-hyphen slug)'}
Audience: ${audience}
Target size: about ${targetNodes} nodes (ok to vary ±30%).
${narratorName ? `Narrator name to use: ${narratorName}` : ''}

Headers / beats to cover, in roughly this order:
${headerLines}

============================================================
NARRATIONS ALREADY IN THE APP (match this style; DO NOT reuse these slugs)
============================================================
${existingList}
Existing slugs to avoid: ${existingSlugs.length ? existingSlugs.join(', ') : '(none)'}

============================================================
HARD RULES (a validator WILL reject the file if any are broken)
============================================================
1. Output VALID JSON ONLY. No markdown, no comments, no trailing commas, no text before/after.
2. Every node id MUST be "${slug || 'your-slug'}::local-id" where both parts are lowercase letters/numbers
   with single hyphens. Regex: ^[a-z0-9]+(?:-[a-z0-9]+)*::[a-z0-9]+(?:-[a-z0-9]+)*$
3. "nodes" is an OBJECT MAP. Each map key MUST equal that node's "id".
4. Every node has: id, narration (= slug), type, title, summary, factuality, children (array).
   - type ∈ "root" | "simple" | "consequence"
   - factuality ∈ "historical" | "speculative" | "alternate"
5. Children counts (OUT-DEGREE):
   - root node: 2–3 children.
   - simple / consequence node: 0, 1, or 2 children (NEVER 3+).
   - 0 children = an ending (leaf).
6. Each child edge is an object: { "targetId": "<existing node id>", "edgeType": "causal" | "consequence" }.
   - Optional layout hints: "branchSide": "left" | "right" | "center", and "branchLabel": short label.
   - Every targetId MUST exist in this same nodes map.
7. The graph MUST be a DAG (no cycles). Convergence is allowed and encouraged:
   a node may have TWO parents (two different nodes can both list it as a child).
8. crossLinks (optional) is an array of { "targetNodeId": "other-narration::id", "label": "..." }.
9. "prediction" (optional but strongly encouraged on branching nodes) is:
   { "question": "...", "choices": [ { "id","text","correct"(bool),"feedback", "leadsTo"(optional node id) }, ... ] }
   - 2–4 choices, at least one correct, every choice needs feedback.
10. rootNodeIds is a non-empty array of ids that exist in nodes (usually one root).

============================================================
WEB-SHAPE RULES (this makes the graph fun, not a straight line)
============================================================
A. MOST important story nodes should have 2 children — a meaningful "left" answer and "right" answer.
   Use branchSide "left" / "right" on those two edges so the web spreads sideways, not just downward.
B. Use 1 child ONLY for bridge/recap/reference nodes or when history truly had one necessary next step.
C. The two branches must be MEANINGFULLY DIFFERENT real directions (e.g. Body vs Mind, Experiment vs Theory,
   Books vs Discoveries, Technology vs Idea) — NOT "correct answer vs silly answer".
D. Add CONVERGENCE: paths that split should sometimes MERGE again at a shared node (two parents).
   This is what turns a tree into a web.
E. Avoid long straight chains (6+ single-child nodes in a row). Break them up with a real split.
F. Aim for at least one convergence node and a balanced left/right spread.

============================================================
CONTENT & TONE RULES
============================================================
- Be factually accurate. Mark factuality honestly: "historical" = real evidence,
  "speculative" = educated extrapolation, "alternate" = explicit what-if.
- summary: 2–4 short lines (use \\n between lines). Kid-friendly but accurate. End branching nodes with a guess hook.
- Add "sources" (label + url) on key historical nodes.
- Add a short "consequences" string explaining significance.
- Add a "powerUp" { title, text } on most nodes naming the thinking skill learned.
- Include a "narrator" object and 2–4 "missions" (themed paths through real node ids).
- Cover the requested headers, but you may add connective nodes to keep the web shape.

============================================================
EXACT SHAPE TO COPY (replace content; keep structure). This tiny example shows a
left/right split that CONVERGES — scale this up to the full topic:
============================================================
${CANONICAL_EXAMPLE}

============================================================
NOW OUTPUT
============================================================
Return ONLY the final JSON for slug "${slug || 'your-slug'}". No explanation. Begin with { and end with }.`
}
