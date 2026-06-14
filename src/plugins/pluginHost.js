/**
 * Lightweight plugin host for analytics, memory, game mechanics, etc.
 *
 * Plugins register once at startup. The app emits domain events; plugins react.
 *
 * Event names (convention: domain:action):
 *   app:ready
 *   narration:loaded
 *   node:visited | node:expanded | node:collapsed
 *   branches:collapsed-all
 *   panel:opened | panel:closed
 *   view:changed
 */

const plugins = new Map()
const wildcardListeners = new Set()

function createStorageHelpers() {
  const prefix = 'history-explorer:'

  return {
    key(name) {
      return `${prefix}${name}`
    },
    read(name, fallback = null) {
      try {
        const raw = localStorage.getItem(`${prefix}${name}`)
        return raw ? JSON.parse(raw) : fallback
      } catch {
        return fallback
      }
    },
    write(name, value) {
      try {
        localStorage.setItem(`${prefix}${name}`, JSON.stringify(value))
      } catch { /* quota or private mode */ }
    },
    appendToList(name, entry, maxLength = 500) {
      const list = this.read(name, [])
      list.push({ ...entry, ts: Date.now() })
      if (list.length > maxLength) list.splice(0, list.length - maxLength)
      this.write(name, list)
    }
  }
}

const storage = createStorageHelpers()

export const pluginApi = {
  storage,
  emit,
  onAny(handler) {
    wildcardListeners.add(handler)
    return () => wildcardListeners.delete(handler)
  },
  getPlugin(id) {
    return plugins.get(id)
  },
  listPlugins() {
    return [...plugins.keys()]
  }
}

export function registerPlugin(plugin) {
  if (!plugin?.id) throw new Error('Plugin must have an id')
  if (plugins.has(plugin.id)) {
    console.warn(`[plugins] "${plugin.id}" already registered — skipping`)
    return
  }

  plugins.set(plugin.id, plugin)

  if (typeof plugin.setup === 'function') {
    plugin.setup(pluginApi)
  }
}

export function emit(event, payload = {}) {
  const envelope = { event, payload, ts: Date.now() }

  for (const plugin of plugins.values()) {
    try {
      if (typeof plugin.onEvent === 'function') {
        plugin.onEvent(envelope, pluginApi)
      }
      if (plugin.handlers?.[event]) {
        plugin.handlers[event](payload, pluginApi)
      }
    } catch (err) {
      console.error(`[plugins] "${plugin.id}" failed on ${event}:`, err)
    }
  }

  for (const listener of wildcardListeners) {
    try {
      listener(envelope)
    } catch (err) {
      console.error('[plugins] wildcard listener failed:', err)
    }
  }
}

export function initPlugins(pluginList) {
  for (const plugin of pluginList) {
    registerPlugin(plugin)
  }
  emit('app:ready', { pluginIds: [...plugins.keys()] })
}
