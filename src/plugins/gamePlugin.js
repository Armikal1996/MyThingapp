export const gamePlugin = {
  id: 'game',

  setup(api) {
    api.storage.write('game:schemaVersion', 1)
  },

  handlers: {
    'guess:made'(payload, api) {
      api.storage.appendToList('game:guesses', payload, 500)
    },

    'badge:earned'(payload, api) {
      api.storage.appendToList('game:badges-earned', payload, 200)
    },

    'mode:changed'(payload, api) {
      api.storage.write('game:researchMode', payload.researchMode === true)
    }
  }
}
