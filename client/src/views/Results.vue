<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
    <nav class="bg-white dark:bg-gray-800 shadow sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <div class="flex items-center space-x-2">
                <img src="/assets/score.png" alt="Score" class="h-6 w-6">
                <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Prompt Evaluation Test Harness</h1>
              </div>
            </div>
            <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
              <router-link
                to="/"
                class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Dashboard
              </router-link>
              <router-link
                to="/datasets"
                class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Datasets
              </router-link>
              <router-link
                to="/prompts"
                class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Prompts
              </router-link>
              <router-link
                to="/evaluations"
                class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Evaluations
              </router-link>
            </div>
          </div>
          <div class="flex items-center">
            <ThemeToggle />
            <span class="text-sm text-gray-500 dark:text-gray-300 mr-4 ml-4">{{ user?.username }}</span>
            <button
              @click="logout"
              class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
    
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Evaluation Results</h2>
        <p class="text-gray-600 dark:text-gray-400">Results analysis will be implemented here.</p>
      </div>
    </main>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'

export default {
  name: 'Results',
  components: {
    ThemeToggle
  },
  setup() {
    const authStore = useAuthStore()
    const user = computed(() => authStore.currentUser)
    const logout = () => authStore.logout()
    
    return { user, logout }
  }
}
</script>