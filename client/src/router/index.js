import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/datasets',
    name: 'Datasets',
    component: () => import('@/views/Datasets.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/prompts',
    name: 'Prompts',
    component: () => import('@/views/Prompts.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/evaluations',
    name: 'Evaluations',
    component: () => import('@/views/Evaluations.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/evaluations/:id',
    name: 'EvaluationDetail',
    component: () => import('@/views/Evaluations.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/evaluations/:id/results',
    name: 'Results',
    component: () => import('@/views/Results.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/csv-to-jsonl',
    name: 'CsvToJsonlConverter',
    component: () => import('@/views/CsvToJsonlConverter.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.meta.requiresAuth !== false
  
  if (requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router