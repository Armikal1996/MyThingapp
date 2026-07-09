import { createApp } from 'vue'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import { bootstrapPlugins } from '@/plugins/index.js'
import { router } from '@/router/index.js'
import App from '@/App.vue'

bootstrapPlugins()

createApp(App).use(router).mount('#app')
