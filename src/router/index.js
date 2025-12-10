import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Login from '../views/Login.vue'
import LeitnerBox from '../views/LeitnerBox.vue'

const routes = [
  { path: '/', redirect: '/app' },
  { path: '/login', component: Login, meta: { requiresGuest: true } },
  { path: '/app', component: LeitnerBox, meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  
  if (authStore.loading) {
    await new Promise(resolve => {
      const unwatch = authStore.$subscribe(() => {
        if (!authStore.loading) {
          unwatch()
          resolve()
        }
      })
    })
  }

  if (to.meta.requiresAuth && !authStore.user) return '/login'
  if (to.meta.requiresGuest && authStore.user) return '/app'
})

export default router

