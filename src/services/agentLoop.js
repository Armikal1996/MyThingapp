/**
 * Multi-turn agent loop: LLM → parse actions → execute → follow-up.
 */

import { addMessage, getThread, listMessages, updateThread } from '@/services/aiChat.js'
import { chatCompletionStream } from '@/services/lmstudio.js'
import { buildAgentSystemPrompt } from '@/services/agentPrompt.js'
import {
  parseMyThingActions,
  stripActionBlocks,
  formatToolResults
} from '@/services/agentParser.js'
import { executeTool, getToolTier, TOOL_TIERS } from '@/services/agentTools.js'
import { isTauri } from '@/services/platform.js'

const MAX_LOOPS = 3

async function callLlm(thread, apiMessages, modelId, onStreamChunk) {
  if (onStreamChunk) {
    const result = await chatCompletionStream(
      thread.modelKey,
      apiMessages,
      modelId,
      (chunk, full) => onStreamChunk(chunk, full)
    )
    return result.content
  }
  const { chatCompletion } = await import('@/services/lmstudio.js')
  const result = await chatCompletion(thread.modelKey, apiMessages, modelId)
  return result.content
}

export async function runAgentLoop(threadId, userContent, options = {}) {
  const {
    contextItems = [],
    modelId = null,
    onStreamChunk = null,
    onPendingAction = null,
    skipUserMessage = false
  } = options

  const thread = await getThread(threadId)
  if (!thread) throw new Error('Thread not found')

  if (!skipUserMessage) {
    await addMessage(threadId, 'user', userContent)
  }

  const executedActions = []
  const pendingActions = []
  let assistantMessage = null

  for (let loop = 0; loop < MAX_LOOPS; loop++) {
    const history = await listMessages(threadId)
    const apiMessages = history.map(m => ({ role: m.role, content: m.content }))

    const messages = [
      { role: 'system', content: buildAgentSystemPrompt(thread, contextItems) },
      ...apiMessages
    ]

    if (loop > 0) onStreamChunk?.('', '')

    const raw = await callLlm(thread, messages, modelId, onStreamChunk)
    const visibleContent = stripActionBlocks(raw) || raw.trim() || 'Done.'
    const actions = parseMyThingActions(raw)

    if (!actions.length) {
      assistantMessage = await addMessage(threadId, 'assistant', visibleContent)
      break
    }

    const toolResults = []

    for (const action of actions) {
      const tier = getToolTier(action.tool)
      const osTool = ['start_app', 'open_app_folder', 'open_app_in_cursor'].includes(action.tool)

      if (tier === TOOL_TIERS.confirm) {
        if (osTool && !isTauri()) {
          toolResults.push({ tool: action.tool, ok: false, error: 'OS actions require the desktop app.' })
          continue
        }
        const pending = {
          ...action,
          id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
        }
        pendingActions.push(pending)
        onPendingAction?.(pending)
        toolResults.push({
          tool: action.tool,
          ok: true,
          result: { status: 'pending_confirmation', summary: action.summary }
        })
        continue
      }

      try {
        const result = await executeTool(action.tool, action.args)
        executedActions.push({
          tool: action.tool,
          args: action.args,
          summary: result.summary || action.summary,
          result
        })
        toolResults.push({ tool: action.tool, ok: true, result })
      } catch (e) {
        toolResults.push({ tool: action.tool, ok: false, error: e.message })
      }
    }

    const statusNote = visibleContent || `Executing ${actions.length} action(s)…`
    await addMessage(threadId, 'assistant', statusNote)
    await addMessage(threadId, 'user', `[Tool results]\n${formatToolResults(toolResults)}`)

    const onlyPending = toolResults.every(r => r.ok && r.result?.status === 'pending_confirmation')
    if (onlyPending) {
      assistantMessage = await addMessage(
        threadId,
        'assistant',
        visibleContent || 'Waiting for your confirmation on the action above.'
      )
      break
    }
  }

  if (!assistantMessage) {
    assistantMessage = await addMessage(threadId, 'assistant', 'Done.')
  }

  if (thread.title === 'New chat' && userContent?.length > 0) {
    const title = userContent.slice(0, 48) + (userContent.length > 48 ? '…' : '')
    await updateThread(threadId, { title })
  }

  return { assistantMessage, executedActions, pendingActions }
}

export async function confirmPendingAction(threadId, action) {
  const result = await executeTool(action.tool, action.args)
  const summary = result.summary || action.summary
  await addMessage(threadId, 'user', `[Confirmed] ${action.tool}: ${summary}`)
  await addMessage(threadId, 'assistant', `Done — ${summary}`)
  return { result, summary }
}
