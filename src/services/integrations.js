import {
  formatContextBlock,
  getContextItem,
  hubItemIcon,
  hubItemKey,
  parseHubItemKey
} from '@/services/hubContext.js'
import { createThread, sendChatMessage } from '@/services/aiChat.js'
import { saveAnnouncement, createEmptyAnnouncement } from '@/services/announcements.js'
import { saveFavorite, newFavoriteId, listAllFavorites } from '@/services/favorites.js'
import { saveReminder, createEmptyReminder, newReminderId } from '@/services/reminders.js'
import { saveEvent, newEventId, createEmptyEvent } from '@/services/calendar.js'
import { getWatchItem, updateWatchItem } from '@/services/media.js'

export function hubItemFromRaw(type, raw) {
  const id = raw.id
  const title = raw.title || raw.name || 'Untitled'
  return { type, id, key: hubItemKey(type, id), title, raw }
}

export async function askAiAbout(item, prompt, router) {
  const contextItem = item.key
    ? item
    : await getContextItem(item.type, item.id)

  if (!contextItem) throw new Error('Item not found')

  const modelKey = item.type === 'task' || item.type === 'app' ? 'gemma' : 'gemma'
  const thread = await createThread({
    title: contextItem.title,
    modelKey
  })

  const contextBlock = formatContextBlock([contextItem])
  const userMessage = prompt
    ? `${prompt}\n\n${contextBlock}`
    : `Help me with this:\n\n${contextBlock}`

  await sendChatMessage(thread.id, userMessage)

  if (router) {
    await router.push({ path: '/ai', query: { thread: thread.id } })
  }

  return thread
}

export async function dispatchToAgent(item, role = 'implementation') {
  const contextItem = item.key
    ? item
    : await getContextItem(item.type, item.id)

  if (!contextItem) throw new Error('Item not found')

  const ann = createEmptyAnnouncement()
  ann.title = `Work on: ${contextItem.title}`
  ann.body = formatContextBlock([contextItem])
  ann.agentRole = role
  ann.priority = 'normal'

  return saveAnnouncement(ann)
}

export async function pinQuickFavorite(item) {
  const contextItem = item.key
    ? item
    : await getContextItem(item.type, item.id)

  if (!contextItem) throw new Error('Item not found')

  const key = hubItemKey(contextItem.type, contextItem.id)
  const existing = await listAllFavorites()
  const found = existing.find(f => f.targetType === 'hub_item' && f.targetId === key)
  if (found) return found

  return saveFavorite({
    id: newFavoriteId(),
    label: contextItem.title,
    icon: hubItemIcon(contextItem.type),
    description: contextItem.subtitle || `${contextItem.type} pin`,
    targetType: 'hub_item',
    targetId: key,
    groupName: 'From your hub',
    sortOrder: 0,
    enabled: true
  })
}

export async function createReminderFor(item, when = null) {
  const contextItem = item.key
    ? item
    : await getContextItem(item.type, item.id)

  if (!contextItem) throw new Error('Item not found')

  const remindAt = when || new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const reminder = createEmptyReminder(new Date(remindAt))
  reminder.id = newReminderId()
  reminder.title = contextItem.title
  reminder.description = `Reminder for ${contextItem.type}: ${contextItem.title}`
  reminder.remindAt = remindAt
  reminder.linkedType = contextItem.type
  reminder.linkedId = contextItem.id

  return saveReminder(reminder)
}

export async function syncTaskToCalendar(task) {
  if (!task.dueAt) throw new Error('Task has no due date')

  const eventId = `task-evt-${task.id}`
  const due = new Date(task.dueAt)
  const end = new Date(due)
  end.setHours(end.getHours() + 1)

  const event = {
    id: eventId,
    title: `Task: ${task.title}`,
    description: `Linked task ${task.id}\n${task.description || ''}`,
    startAt: due.toISOString(),
    endAt: end.toISOString(),
    allDay: false,
    color: '#f59e0b'
  }

  return saveEvent(event)
}

export async function createWatchTonight(item) {
  const contextItem = item.key
    ? item
    : await getContextItem(item.type, item.id)

  if (!contextItem) throw new Error('Item not found')

  const tonight = new Date()
  tonight.setHours(20, 0, 0, 0)
  const end = new Date(tonight)
  end.setHours(22, 0, 0, 0)

  const event = createEmptyEvent(tonight)
  event.id = newEventId()
  event.title = contextItem.type === 'game' ? `Play: ${contextItem.title}` : `Watch: ${contextItem.title}`
  event.description = `Hub ${contextItem.type}:${contextItem.id}`
  event.startAt = tonight.toISOString()
  event.endAt = end.toISOString()

  await saveEvent(event)
  await createReminderFor(contextItem, tonight.toISOString())

  return event
}

export async function incrementWatchEpisode(watchId) {
  const item = await getWatchItem(watchId)
  if (!item || item.mediaType !== 'series') throw new Error('Not a series item')

  const season = item.season || 1
  const episode = (item.episode || 0) + 1

  return updateWatchItem(watchId, {
    season,
    episode,
    status: 'watching'
  })
}

export function openInModule(item, router) {
  const key = item.key || hubItemKey(item.type, item.id)
  const routes = {
    task: '/tasks',
    game: '/media',
    watch: '/media',
    app: '/launcher',
    event: '/calendar'
  }
  const path = routes[item.type] || '/'
  return router.push({
    path,
    query: item.type === 'task' || item.type === 'game' || item.type === 'watch'
      ? { highlight: item.id }
      : {}
  })
}

export async function openAiWithContext(keys, router) {
  const query = { context: Array.isArray(keys) ? keys.join(',') : keys }
  return router.push({ path: '/ai', query })
}

export async function navigateToLinkedItem(linkedType, linkedId, router) {
  if (!linkedType || !linkedId) return

  switch (linkedType) {
    case 'task':
      return router.push({ path: '/tasks', query: { highlight: linkedId } })
    case 'game':
    case 'watch':
      return router.push({ path: '/media', query: { highlight: linkedId } })
    case 'app':
      return router.push({ path: '/launcher', query: { highlight: linkedId } })
    case 'event':
      return router.push({ path: '/calendar', query: { highlight: linkedId } })
    default:
      return router.push('/')
  }
}

export async function resolveHubFavorite(fav, router) {
  if (fav.targetType !== 'hub_item') return null
  const parsed = parseHubItemKey(fav.targetId)
  if (!parsed) return null

  const item = await getContextItem(parsed.type, parsed.id)
  if (!item) return router.push('/')

  if (parsed.type === 'task') return router.push({ path: '/tasks', query: { highlight: parsed.id } })
  if (parsed.type === 'game' || parsed.type === 'watch') {
    return router.push({ path: '/media', query: { highlight: parsed.id } })
  }
  if (parsed.type === 'app') return router.push({ path: '/launcher', query: { highlight: parsed.id } })
  if (parsed.type === 'event') return router.push({ path: '/calendar', query: { highlight: parsed.id } })

  return openAiWithContext([fav.targetId], router)
}
