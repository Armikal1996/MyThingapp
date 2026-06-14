/**
 * Session memory — snapshots expand/collapse state per narration.
 * Future game mechanics (predictions, scores) can read/write via the same store.
 */
export const memoryPlugin = {
  id: 'memory',

  setup(api) {
    api.storage.write('memory:schemaVersion', 1)
  },

  handlers: {
    'narration:loaded'(payload, api) {
      const slug = payload.slug
      const sessions = api.storage.read('memory:sessions', {})
      if (!sessions[slug]) {
        sessions[slug] = { visitCount: 0, lastOpened: null }
      }
      sessions[slug].visitCount += 1
      sessions[slug].lastOpened = Date.now()
      api.storage.write('memory:sessions', sessions)
    },

    'node:expanded'(payload, api) {
      appendAction(api, payload.slug, 'expand', payload.nodeId)
    },

    'node:collapsed'(payload, api) {
      appendAction(api, payload.slug, 'collapse', payload.nodeId)
    },

    'branches:collapsed-all'(payload, api) {
      appendAction(api, payload.slug, 'collapse-all', null)
    }
  }
}

function appendAction(api, slug, action, nodeId) {
  if (!slug) return
  const key = `memory:actions:${slug}`
  api.storage.appendToList(key, { action, nodeId }, 200)
}
