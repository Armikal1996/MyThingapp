import { createRouter, createWebHashHistory } from 'vue-router'
import HubLayout from '@/layouts/HubLayout.vue'
import HubDashboard from '@/views/HubDashboard.vue'
import HistoryGameModule from '@/modules/history-game/HistoryGameModule.vue'
import LauncherModule from '@/modules/launcher/LauncherModule.vue'
import TasksModule from '@/modules/tasks/TasksModule.vue'
import FavoritesModule from '@/modules/favorites/FavoritesModule.vue'
import CalendarModule from '@/modules/calendar/CalendarModule.vue'

const routes = [
  {
    path: '/',
    component: HubLayout,
    children: [
      {
        path: '',
        name: 'dashboard',
        component: HubDashboard,
        meta: { title: 'Dashboard' }
      },
      {
        path: 'launcher',
        name: 'launcher',
        component: LauncherModule,
        meta: { title: 'App Launcher' }
      },
      {
        path: 'tasks',
        name: 'tasks',
        component: TasksModule,
        meta: { title: 'Tasks' }
      },
      {
        path: 'favorites',
        name: 'favorites',
        component: FavoritesModule,
        meta: { title: 'Favorites' }
      },
      {
        path: 'calendar',
        name: 'calendar',
        component: CalendarModule,
        meta: { title: 'Calendar' }
      },
      {
        path: 'history-game',
        name: 'history-game',
        component: HistoryGameModule,
        meta: { title: 'History Game' }
      }
    ]
  }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
