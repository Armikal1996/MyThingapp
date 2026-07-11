/**
 * Parse mything-action JSON blocks from assistant responses.
 */

import { isKnownTool } from '@/services/agentTools.js'

const ACTION_BLOCK_RE = /```mything-action\s*([\s\S]*?)```/gi

export function parseMyThingActions(content) {
  if (!content) return []

  const actions = []
  let match
  const re = new RegExp(ACTION_BLOCK_RE.source, ACTION_BLOCK_RE.flags)

  while ((match = re.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim())
      if (!parsed.tool || !isKnownTool(parsed.tool)) continue
      actions.push({
        tool: parsed.tool,
        args: parsed.args || {},
        summary: parsed.summary || `${parsed.tool}`
      })
    } catch {
      /* skip invalid JSON blocks */
    }
  }
  return actions
}

export function stripActionBlocks(content) {
  if (!content) return ''
  return content
    .replace(ACTION_BLOCK_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function formatToolResults(results) {
  return results
    .map(r => {
      const status = r.ok ? 'success' : 'error'
      const detail = r.ok ? JSON.stringify(r.result) : r.error
      return `[Tool ${r.tool}: ${status}] ${detail}`
    })
    .join('\n')
}
