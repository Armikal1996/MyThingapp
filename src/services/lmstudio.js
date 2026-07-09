import { invoke } from '@tauri-apps/api/core'
import { getLmStudioConfig, isTauri } from '@/services/platform.js'

export function getModelOptions() {
  const config = getLmStudioConfig()
  return Object.entries(config.models).map(([key, model]) => ({
    key,
    label: model.label,
    role: model.role,
    baseUrl: model.baseUrl,
    port: model.port
  }))
}

export function getModelByKey(key) {
  const config = getLmStudioConfig()
  return config.models[key] || null
}

export function roleForModelKey(key) {
  return getModelByKey(key)?.role || 'general'
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options)
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`LM Studio returned ${res.status}: ${text}`)
  }
  return JSON.parse(text)
}

export async function checkModelHealth(modelKey) {
  const model = getModelByKey(modelKey)
  if (!model) {
    return { online: false, error: 'Unknown model' }
  }

  try {
    let data
    if (isTauri()) {
      const raw = await invoke('lmstudio_list_models', { baseUrl: model.baseUrl })
      data = JSON.parse(raw)
    } else {
      data = await fetchJson(`${model.baseUrl}/models`)
    }

    const models = data?.data || []
    const firstId = models[0]?.id || null
    if (!models.length || !firstId) {
      return {
        online: false,
        modelId: null,
        count: 0,
        error: 'Server up, but no model loaded'
      }
    }
    return { online: true, modelId: firstId, count: models.length }
  } catch (e) {
    return { online: false, error: e.message }
  }
}

export async function checkAllModels() {
  const options = getModelOptions()
  const results = {}
  for (const opt of options) {
    results[opt.key] = await checkModelHealth(opt.key)
  }
  return results
}

export async function chatCompletion(modelKey, messages, modelId = null) {
  const model = getModelByKey(modelKey)
  if (!model) {
    throw new Error(`Unknown model: ${modelKey}`)
  }

  let raw
  if (isTauri()) {
    raw = await invoke('lmstudio_chat_completion', {
      baseUrl: model.baseUrl,
      model: modelId,
      messages
    })
  } else {
    const body = { messages, stream: false }
    if (modelId) body.model = modelId
    const data = await fetchJson(`${model.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    raw = JSON.stringify(data)
  }

  const data = JSON.parse(raw)
  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('No response content from LM Studio')
  }

  return {
    content,
    model: data?.model || modelId,
    usage: data?.usage || null
  }
}
