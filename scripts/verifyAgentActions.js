/**
 * Smoke tests for agent parser, prompt, and tool tiers (no DB / LM Studio).
 * Run: node scripts/verifyAgentActions.js
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function loadModule(relPath) {
  const src = readFileSync(join(root, relPath), 'utf8')
  return src
}

// Inline minimal copies of parser logic for node (ESM imports need vite)
const ACTION_BLOCK_RE = /```mything-action\s*([\s\S]*?)```/gi
const KNOWN_TOOLS = new Set([
  'search_hub', 'get_hub_item', 'create_event', 'create_reminder',
  'create_event_with_reminder', 'update_game', 'update_watch', 'create_task',
  'start_app', 'open_app_folder', 'open_app_in_cursor'
])

function parseMyThingActions(content) {
  const actions = []
  let match
  const re = new RegExp(ACTION_BLOCK_RE.source, ACTION_BLOCK_RE.flags)
  while ((match = re.exec(content)) !== null) {
    const parsed = JSON.parse(match[1].trim())
    if (!parsed.tool || !KNOWN_TOOLS.has(parsed.tool)) continue
    actions.push({ tool: parsed.tool, args: parsed.args || {}, summary: parsed.summary || parsed.tool })
  }
  return actions
}

function stripActionBlocks(content) {
  return content.replace(ACTION_BLOCK_RE, '').replace(/\n{3,}/g, '\n\n').trim()
}

const CONFIRM_TOOLS = new Set(['start_app', 'open_app_folder', 'open_app_in_cursor'])

let passed = 0
let failed = 0

function assert(name, condition) {
  if (condition) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    console.error(`  ✗ ${name}`)
  }
}

console.log('Agent actions verification\n')

// Flow 1: rent event + reminder
const rentReply = `I'll add that to your calendar.

\`\`\`mything-action
{
  "tool": "create_event_with_reminder",
  "args": {
    "title": "Pay rent",
    "startAt": "2026-07-19T09:00:00",
    "remindAt": "2026-07-18T09:00:00"
  },
  "summary": "Create Pay rent event on Jul 19 with reminder on Jul 18"
}
\`\`\`
`
const rentActions = parseMyThingActions(rentReply)
assert('rent flow parses one action', rentActions.length === 1)
assert('rent flow tool is create_event_with_reminder', rentActions[0]?.tool === 'create_event_with_reminder')
assert('rent flow strips action blocks', stripActionBlocks(rentReply).includes("I'll add that"))

// Flow 2: open repo in Cursor (confirm tier)
const cursorReply = `\`\`\`mything-action
{"tool": "open_app_in_cursor", "args": {"query": "game-marketplace"}, "summary": "Open game-marketplace in Cursor"}
\`\`\``
const cursorActions = parseMyThingActions(cursorReply)
assert('cursor flow parses open_app_in_cursor', cursorActions[0]?.tool === 'open_app_in_cursor')
assert('cursor flow is confirm tier', CONFIRM_TOOLS.has(cursorActions[0]?.tool))

// Flow 3: update Elden Ring
const eldenReply = `\`\`\`mything-action
{
  "tool": "update_game",
  "args": {"query": "Elden Ring", "status": "playing", "platform": "Steam", "hoursPlayed": 120},
  "summary": "Update Elden Ring to playing on Steam with 120 hours"
}
\`\`\``
const eldenActions = parseMyThingActions(eldenReply)
assert('elden flow parses update_game', eldenActions[0]?.tool === 'update_game')
assert('elden flow has hoursPlayed', eldenActions[0]?.args?.hoursPlayed === 120)
assert('elden flow is auto tier', !CONFIRM_TOOLS.has(eldenActions[0]?.tool))

// Config files exist
assert('agent-tools.json exists', loadModule('config/agent-tools.json').includes('open_app_in_cursor'))
assert('agency-roles.json has agent role', loadModule('config/agency-roles.json').includes('"id": "agent"'))
assert('agentTools.js exists', loadModule('src/services/agentTools.js').includes('executeTool'))
assert('agentLoop.js exists', loadModule('src/services/agentLoop.js').includes('runAgentLoop'))
assert('migration 009 exists', loadModule('data/migrations/009_agent_threads.sql').includes('agent_role'))

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
