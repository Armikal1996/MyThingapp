/** Records exploration events for later analysis (localStorage-backed). */
export const analyticsPlugin = {
  id: 'analytics',

  setup(api) {
    if (!api.storage.read('analytics:initialized')) {
      api.storage.write('analytics:initialized', true)
    }
  },

  onEvent({ event, payload }, api) {
    const tracked = new Set([
      'narration:loaded',
      'node:visited',
      'node:expanded',
      'node:collapsed',
      'branches:collapsed-all',
      'panel:opened',
      'view:changed',
      'guess:made',
      'badge:earned',
      'mode:changed'
    ])

    if (!tracked.has(event)) return
    api.storage.appendToList('analytics:events', { event, payload })
  }
}
