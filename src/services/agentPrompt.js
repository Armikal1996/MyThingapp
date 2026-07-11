import { formatContextBlock } from '@/services/hubContext.js'
import { AGENT_TOOLS } from '@/services/agentTools.js'
import { systemPromptForRole } from '@/services/agency.js'

function formatNow() {
  const now = new Date()
  return {
    iso: now.toISOString(),
    local: now.toLocaleString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate()
  }
}

function formatToolsCatalog() {
  return AGENT_TOOLS.map(t => {
    const params = Object.entries(t.parameters)
      .map(([k, v]) => `  - ${k}: ${v}`)
      .join('\n')
    return `### ${t.name} (${t.tier})\n${t.description}\nParameters:\n${params}`
  }).join('\n\n')
}

const AGENT_RULES = `## Agent rules
- You can perform actions in MyThing using mything-action JSON blocks.
- Use ISO 8601 local datetime strings for dates (e.g. "2026-07-19T09:00:00").
- The current date/time is provided below — use it to resolve "the 19th", "tomorrow", "next week".
- Before update_game, update_watch, start_app, open_app_folder, or open_app_in_cursor: the tool will search by query automatically.
- If a search would be ambiguous, ask the user instead of guessing.
- Put human-readable explanation OUTSIDE the action blocks. Put machine actions INSIDE blocks.
- One action per mything-action block.
- OS actions (start_app, open_app_folder, open_app_in_cursor) require user confirmation — still emit the block.

## Action block format
\`\`\`mything-action
{
  "tool": "tool_name",
  "args": { },
  "summary": "Short human-readable description of what this does"
}
\`\`\`

## Examples

User: "Add rent payment on the 19th with a reminder the day before"
\`\`\`mything-action
{
  "tool": "create_event_with_reminder",
  "args": {
    "title": "Pay rent",
    "startAt": "2026-07-19T09:00:00",
    "remindAt": "2026-07-18T09:00:00"
  },
  "summary": "Create Pay rent event on the 19th with reminder on the 18th"
}
\`\`\`

User: "Open game-marketplace in Cursor"
\`\`\`mything-action
{
  "tool": "open_app_in_cursor",
  "args": { "query": "game-marketplace" },
  "summary": "Open game-marketplace repo in Cursor"
}
\`\`\`

User: "Mark Elden Ring as playing on Steam, 120 hours"
\`\`\`mything-action
{
  "tool": "update_game",
  "args": {
    "query": "Elden Ring",
    "status": "playing",
    "platform": "Steam",
    "hoursPlayed": 120
  },
  "summary": "Update Elden Ring to playing on Steam with 120 hours"
}
\`\`\`
`

export function buildAgentSystemPrompt(thread, contextItems = []) {
  const now = formatNow()
  const roleId = thread.agentRole || 'agent'
  const base = systemPromptForRole(roleId)

  const contextBlock = formatContextBlock(contextItems)
  const toolsBlock = formatToolsCatalog()

  return [
    base,
    '',
    'You are MyThing Agent — you can take real actions in the user\'s local hub (calendar, reminders, media, tasks, launcher apps).',
    '',
    `## Current date/time`,
    `- Local: ${now.local}`,
    `- ISO: ${now.iso}`,
    `- Today: ${now.year}-${String(now.month).padStart(2, '0')}-${String(now.day).padStart(2, '0')}`,
    '',
    AGENT_RULES,
    '',
    '## Available tools',
    toolsBlock,
    contextBlock ? `\n${contextBlock}` : ''
  ].join('\n')
}
