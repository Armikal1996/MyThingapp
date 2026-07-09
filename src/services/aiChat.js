import { getDatabase } from '@/services/database.js'
import { chatCompletionStream, getModelByKey } from '@/services/lmstudio.js'
import { formatContextBlock } from '@/services/hubContext.js'
import { systemPromptForRole, modelKeyForAgencyRole } from '@/services/agency.js'

export const MODEL_KEYS = ['gemma', 'gwen']

function rowToThread(row) {
  return {
    id: row.id,
    title: row.title,
    modelKey: row.model_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToMessage(row) {
  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at
  }
}

export function newThreadId() {
  return `thread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function newMessageId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export async function listThreads() {
  const db = await getDatabase()
  const rows = await db.select(
    'SELECT * FROM ai_threads ORDER BY updated_at DESC'
  )
  return rows.map(rowToThread)
}

export async function getThread(id) {
  const db = await getDatabase()
  const rows = await db.select('SELECT * FROM ai_threads WHERE id = $1', [id])
  return rows[0] ? rowToThread(rows[0]) : null
}

export async function createThread({ title, modelKey = 'gemma' }) {
  const db = await getDatabase()
  const id = newThreadId()
  const now = new Date().toISOString()
  await db.execute(
    `INSERT INTO ai_threads (id, title, model_key, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, title.trim() || 'New chat', modelKey, now, now]
  )
  return getThread(id)
}

export async function updateThread(id, patch) {
  const db = await getDatabase()
  const thread = await getThread(id)
  if (!thread) return null

  const title = patch.title ?? thread.title
  const modelKey = patch.modelKey ?? thread.modelKey
  const now = new Date().toISOString()

  await db.execute(
    `UPDATE ai_threads SET title = $1, model_key = $2, updated_at = $3 WHERE id = $4`,
    [title, modelKey, now, id]
  )
  return getThread(id)
}

export async function deleteThread(id) {
  const db = await getDatabase()
  await db.execute('DELETE FROM ai_messages WHERE thread_id = $1', [id])
  await db.execute('DELETE FROM ai_threads WHERE id = $1', [id])
}

export async function listMessages(threadId) {
  const db = await getDatabase()
  const rows = await db.select(
    'SELECT * FROM ai_messages WHERE thread_id = $1 ORDER BY created_at ASC',
    [threadId]
  )
  return rows.map(rowToMessage)
}

export async function addMessage(threadId, role, content) {
  const db = await getDatabase()
  const id = newMessageId()
  const now = new Date().toISOString()

  await db.execute(
    `INSERT INTO ai_messages (id, thread_id, role, content, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, threadId, role, content, now]
  )

  await db.execute(
    'UPDATE ai_threads SET updated_at = $1 WHERE id = $2',
    [now, threadId]
  )

  return { id, threadId, role, content, createdAt: now }
}

function buildSystemPrompt(thread, contextItems = []) {
  const model = getModelByKey(thread.modelKey)
  const base = model?.role === 'review'
    ? systemPromptForRole('review')
    : systemPromptForRole('implementation')

  const contextBlock = formatContextBlock(contextItems)
  if (!contextBlock) return base
  return `${base}\n\n${contextBlock}`
}

export async function sendChatMessage(threadId, userContent, modelId = null, options = {}) {
  const { contextItems = [], onStreamChunk = null } = options
  const thread = await getThread(threadId)
  if (!thread) throw new Error('Thread not found')

  const userMsg = await addMessage(threadId, 'user', userContent)

  try {
    const history = await listMessages(threadId)
    const apiMessages = history.map(m => ({ role: m.role, content: m.content }))

    const messages = [
      { role: 'system', content: buildSystemPrompt(thread, contextItems) },
      ...apiMessages
    ]

    let content = ''
    if (onStreamChunk) {
      const result = await chatCompletionStream(
        thread.modelKey,
        messages,
        modelId,
        (chunk, full) => onStreamChunk(chunk, full)
      )
      content = result.content
    } else {
      const { chatCompletion } = await import('@/services/lmstudio.js')
      const result = await chatCompletion(thread.modelKey, messages, modelId)
      content = result.content
    }

    const assistant = await addMessage(threadId, 'assistant', content)

    if (thread.title === 'New chat' && userContent.length > 0) {
      const title = userContent.slice(0, 48) + (userContent.length > 48 ? '…' : '')
      await updateThread(threadId, { title })
    }

    return assistant
  } catch (e) {
    const db = await getDatabase()
    await db.execute('DELETE FROM ai_messages WHERE id = $1', [userMsg.id])
    throw e
  }
}

export function modelKeyForAgentRole(roleId) {
  return modelKeyForAgencyRole(roleId)
}
