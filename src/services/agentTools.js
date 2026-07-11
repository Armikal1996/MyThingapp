/**
 * Agent tool registry — wraps hub services for AI-driven actions.
 */

import { searchHubItems, getContextItem } from '@/services/hubContext.js'
import { newEventId, saveEvent } from '@/services/calendar.js'
import { newReminderId, saveReminder } from '@/services/reminders.js'
import { getGame, saveGame } from '@/services/media.js'
import { updateWatchItem } from '@/services/media.js'
import { newTaskId, saveTask, TASK_KINDS } from '@/services/tasks.js'
import {
  getApp,
  runAppCommand,
  openAppFolder,
  openAppInCursor
} from '@/services/launcher.js'

export const TOOL_TIERS = {
  auto: 'auto',
  confirm: 'confirm'
}

export const AGENT_TOOLS = [
  {
    name: 'search_hub',
    description: 'Search tasks, games, watchlist, apps, and events by name.',
    tier: TOOL_TIERS.auto,
    parameters: { query: 'string', limit: 'number (optional, default 10)' }
  },
  {
    name: 'get_hub_item',
    description: 'Get details for a hub item by type and id.',
    tier: TOOL_TIERS.auto,
    parameters: { type: 'task|game|watch|app|event', id: 'string' }
  },
  {
    name: 'create_event',
    description: 'Create a calendar event.',
    tier: TOOL_TIERS.auto,
    parameters: { title: 'string', startAt: 'ISO datetime', endAt: 'ISO (optional)', description: 'string', allDay: 'boolean' }
  },
  {
    name: 'create_reminder',
    description: 'Create a reminder, optionally linked to an event/task/game/watch/app.',
    tier: TOOL_TIERS.auto,
    parameters: { title: 'string', remindAt: 'ISO datetime', description: 'string', linkedType: 'string', linkedId: 'string' }
  },
  {
    name: 'create_event_with_reminder',
    description: 'Create a calendar event and an optional linked reminder in one step.',
    tier: TOOL_TIERS.auto,
    parameters: { title: 'string', startAt: 'ISO datetime', endAt: 'ISO (optional)', remindAt: 'ISO (optional)', description: 'string', allDay: 'boolean' }
  },
  {
    name: 'update_game',
    description: 'Update a game in Media by search query.',
    tier: TOOL_TIERS.auto,
    parameters: { query: 'string', status: 'backlog|playing|completed|dropped', platform: 'string', hoursPlayed: 'number', notes: 'string', description: 'string', tags: 'string[]' }
  },
  {
    name: 'update_watch',
    description: 'Update a watchlist item by search query.',
    tier: TOOL_TIERS.auto,
    parameters: { query: 'string', status: 'string', season: 'number', episode: 'number', rating: 'number', notes: 'string' }
  },
  {
    name: 'create_task',
    description: 'Create a work task.',
    tier: TOOL_TIERS.auto,
    parameters: { title: 'string', description: 'string', dueAt: 'ISO (optional)', status: 'backlog|active|done' }
  },
  {
    name: 'start_app',
    description: 'Start a registered launcher app (runs start command in project folder).',
    tier: TOOL_TIERS.confirm,
    parameters: { query: 'string' }
  },
  {
    name: 'open_app_folder',
    description: 'Open a registered app project folder in Explorer.',
    tier: TOOL_TIERS.confirm,
    parameters: { query: 'string' }
  },
  {
    name: 'open_app_in_cursor',
    description: 'Open a registered app project folder in Cursor IDE.',
    tier: TOOL_TIERS.confirm,
    parameters: { query: 'string' }
  }
]

const TOOL_MAP = Object.fromEntries(AGENT_TOOLS.map(t => [t.name, t]))

export function getToolTier(name) {
  return TOOL_MAP[name]?.tier || TOOL_TIERS.confirm
}

export function isKnownTool(name) {
  return Boolean(TOOL_MAP[name])
}

/** Score how well an item matches a query (higher = better). */
function scoreMatch(item, query) {
  const q = query.toLowerCase()
  const fields = [item.title, item.subtitle, item.key].filter(Boolean).join(' ').toLowerCase()
  if (fields === q) return 100
  if (fields.includes(q)) return 80
  const words = q.split(/\s+/).filter(Boolean)
  const matched = words.filter(w => fields.includes(w)).length
  return matched * 10
}

export async function findByQuery(query, type = null) {
  const results = await searchHubItems(query, 15)
  let filtered = type ? results.filter(r => r.type === type) : results
  if (!filtered.length) {
    throw new Error(`No ${type || 'hub item'} matching "${query}"`)
  }
  filtered = filtered
    .map(item => ({ item, score: scoreMatch(item, query) }))
    .sort((a, b) => b.score - a.score)

  const top = filtered[0]
  const second = filtered[1]
  if (second && top.score === second.score && top.score < 80) {
    throw new Error(
      `Ambiguous match for "${query}": "${top.item.title}" or "${second.item.title}"? Please clarify.`
    )
  }
  return top.item
}

async function resolveAppByQuery(query) {
  const hit = await findByQuery(query, 'app')
  const app = await getApp(hit.id)
  if (!app) throw new Error(`App not found: ${hit.id}`)
  return app
}

export async function executeTool(name, args = {}) {
  if (!isKnownTool(name)) {
    throw new Error(`Unknown tool: ${name}`)
  }

  switch (name) {
    case 'search_hub': {
      const results = await searchHubItems(args.query || '', args.limit || 10)
      return { items: results.map(r => ({ type: r.type, id: r.id, title: r.title, key: r.key })) }
    }
    case 'get_hub_item': {
      const item = await getContextItem(args.type, args.id)
      if (!item) throw new Error(`Item not found: ${args.type}:${args.id}`)
      return { item }
    }
    case 'create_event': {
      const eventId = args.id || newEventId()
      const startAt = args.startAt
      let endAt = args.endAt
      if (!endAt && startAt) {
        const end = new Date(startAt)
        end.setHours(end.getHours() + 1)
        endAt = end.toISOString()
      }
      const event = await saveEvent({
        id: eventId,
        title: args.title,
        description: args.description || '',
        startAt,
        endAt: endAt || null,
        allDay: Boolean(args.allDay),
        color: args.color || '#3b82f6'
      })
      return { event, summary: `Created event: ${event.title}` }
    }
    case 'create_reminder': {
      const reminder = await saveReminder({
        id: newReminderId(),
        title: args.title,
        description: args.description || '',
        remindAt: args.remindAt,
        linkedType: args.linkedType || null,
        linkedId: args.linkedId || null,
        fired: false,
        enabled: true
      })
      return { reminder, summary: `Created reminder: ${reminder.title}` }
    }
    case 'create_event_with_reminder': {
      const eventId = newEventId()
      let endAt = args.endAt
      if (!endAt && args.startAt) {
        const end = new Date(args.startAt)
        end.setHours(end.getHours() + 1)
        endAt = end.toISOString()
      }
      const event = await saveEvent({
        id: eventId,
        title: args.title,
        description: args.description || '',
        startAt: args.startAt,
        endAt: endAt || null,
        allDay: Boolean(args.allDay),
        color: args.color || '#3b82f6'
      })
      let reminder = null
      if (args.remindAt) {
        reminder = await saveReminder({
          id: newReminderId(),
          title: args.reminderTitle || `Reminder: ${args.title}`,
          description: args.description || '',
          remindAt: args.remindAt,
          linkedType: 'event',
          linkedId: eventId,
          fired: false,
          enabled: true
        })
      }
      return {
        event,
        reminder,
        summary: reminder
          ? `Created event "${event.title}" with reminder`
          : `Created event: ${event.title}`
      }
    }
    case 'update_game': {
      const hit = await findByQuery(args.query, 'game')
      const game = await getGame(hit.id)
      if (!game) throw new Error(`Game not found: ${hit.id}`)
      const { query: _q, ...patch } = args
      const updated = await saveGame({
        ...game,
        ...patch,
        tags: patch.tags ?? game.tags
      })
      return { game: updated, summary: `Updated game: ${updated.title}` }
    }
    case 'update_watch': {
      const hit = await findByQuery(args.query, 'watch')
      const { query: _q, ...patch } = args
      const updated = await updateWatchItem(hit.id, patch)
      return { watch: updated, summary: `Updated watchlist item: ${updated.title}` }
    }
    case 'create_task': {
      const task = await saveTask({
        id: newTaskId(),
        title: args.title,
        description: args.description || '',
        kind: TASK_KINDS.WORK,
        status: args.status || 'backlog',
        dueAt: args.dueAt || null,
        priority: args.priority ?? 0,
        sortOrder: 0,
        tags: args.tags || []
      })
      return { task, summary: `Created task: ${task.title}` }
    }
    case 'start_app': {
      const app = await resolveAppByQuery(args.query)
      await runAppCommand(app, 'start')
      return { app: { id: app.id, title: app.title }, summary: `Started ${app.title}` }
    }
    case 'open_app_folder': {
      const app = await resolveAppByQuery(args.query)
      await openAppFolder(app)
      return { app: { id: app.id, title: app.title }, summary: `Opened folder for ${app.title}` }
    }
    case 'open_app_in_cursor': {
      const app = await resolveAppByQuery(args.query)
      await openAppInCursor(app)
      return { app: { id: app.id, title: app.title }, summary: `Opened ${app.title} in Cursor` }
    }
    default:
      throw new Error(`Tool not implemented: ${name}`)
  }
}
