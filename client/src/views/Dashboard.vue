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
                class="border-indigo-500 text-gray-900 dark:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
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
      <div class="px-4 sm:px-0">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h2>
        
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Datasets</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">{{ stats.datasets }}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <router-link to="/datasets" class="text-sm text-indigo-700 dark:text-indigo-400 font-medium hover:text-indigo-900 dark:hover:text-indigo-300">
                View all
              </router-link>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Prompts</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">{{ stats.prompts }}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <router-link to="/prompts" class="text-sm text-indigo-700 dark:text-indigo-400 font-medium hover:text-indigo-900 dark:hover:text-indigo-300">
                View all
              </router-link>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Evaluations</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">{{ stats.evaluations }}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <router-link to="/evaluations" class="text-sm text-indigo-700 dark:text-indigo-400 font-medium hover:text-indigo-900 dark:hover:text-indigo-300">
                View all
              </router-link>
            </div>
          </div>
        </div>

        <!-- Recent Evaluations -->
        <div v-if="!isLoading && recentEvaluations.length > 0" class="mt-8">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">Recent Evaluations</h3>
            <router-link to="/evaluations" class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
              View all
            </router-link>
          </div>
          <div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
            <ul class="divide-y divide-gray-200 dark:divide-gray-700">
              <li v-for="evaluation in recentEvaluations" :key="evaluation.id" class="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200" @click="openEvaluationDetail(evaluation.id)">
                <div class="flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center space-x-3">
                      <h4 class="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {{ evaluation.name }}
                      </h4>
                      <span :class="getStatusBadgeClass(evaluation.status)" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
                        {{ getStatusText(evaluation.status) }}
                      </span>
                    </div>
                    <div class="mt-1 flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>{{ evaluation.prompt_name }}</span>
                      <span>•</span>
                      <span>{{ evaluation.dataset_name }}</span>
                      <span>•</span>
                      <span>{{ formatDate(evaluation.created_at) }}</span>
                    </div>
                  </div>
                  <div class="flex items-center space-x-4">
                    <div v-if="evaluation.status === 'completed' && evaluation.accuracy !== null" class="text-right">
                      <div :class="getAccuracyClass(evaluation.accuracy)" class="text-sm font-medium">
                        {{ evaluation.accuracy }}% accuracy
                      </div>
                      <div class="text-xs text-gray-500">
                        {{ evaluation.processed_messages }}/{{ evaluation.total_messages }} messages
                      </div>
                    </div>
                    <div v-else-if="evaluation.status === 'running'" class="text-right">
                      <div class="text-sm text-blue-600 font-medium">
                        Running...
                      </div>
                      <div class="text-xs text-gray-500">
                        {{ evaluation.processed_messages || 0 }}/{{ evaluation.total_messages }} messages
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="mt-8">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <router-link
              to="/datasets/"
              class="relative group bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500"
            >
              <div class="flex items-center space-x-4">
                <div class="bg-indigo-50 dark:bg-indigo-900/50 rounded-lg p-3 flex-shrink-0">
                  <svg class="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h4 class="text-lg font-medium text-gray-900 dark:text-white">New Dataset</h4>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Upload a JSONL file with labeled messages</p>
                </div>
              </div>
            </router-link>
            
            <router-link
              to="/prompts/"
              class="relative group bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500"
            >
              <div class="flex items-center space-x-4">
                <div class="bg-indigo-50 dark:bg-indigo-900/50 rounded-lg p-3 flex-shrink-0">
                  <svg class="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h4 class="text-lg font-medium text-gray-900 dark:text-white">New Prompt</h4>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Create a prompt template for evaluation</p>
                </div>
              </div>
            </router-link>
            
            <router-link
              to="/evaluations/"
              class="relative group bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500"
            >
              <div class="flex items-center space-x-4">
                <div class="bg-indigo-50 dark:bg-indigo-900/50 rounded-lg p-3 flex-shrink-0">
                  <svg class="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h4 class="text-lg font-medium text-gray-900 dark:text-white">New Evaluation</h4>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Run a prompt against a dataset</p>
                </div>
              </div>
            </router-link>
          </div>
        </div>

        <div class="mt-8">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Getting Started</h3>
          <div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
            <ol class="divide-y divide-gray-200 dark:divide-gray-700">
              <li class="px-6 py-4">
                <div class="flex items-start">
                  <span class="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-medium">1</span>
                  <div class="ml-4">
                    <h4 class="text-sm font-medium text-gray-900 dark:text-white">Create a Dataset</h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Upload a JSONL file with labeled messages</p>
                  </div>
                </div>
              </li>
              <li class="px-6 py-4">
                <div class="flex items-start">
                  <span class="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-medium">2</span>
                  <div class="ml-4">
                    <h4 class="text-sm font-medium text-gray-900 dark:text-white">Design a Prompt</h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Create a prompt template with classification instructions</p>
                  </div>
                </div>
              </li>
              <li class="px-6 py-4">
                <div class="flex items-start">
                  <span class="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-medium">3</span>
                  <div class="ml-4">
                    <h4 class="text-sm font-medium text-gray-900 dark:text-white">Run an Evaluation</h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Test your prompt against the dataset</p>
                  </div>
                </div>
              </li>
              <li class="px-6 py-4">
                <div class="flex items-start">
                  <span class="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-medium">4</span>
                  <div class="ml-4">
                    <h4 class="text-sm font-medium text-gray-900 dark:text-white">Analyze Results</h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Review metrics and iterate on your prompt</p>
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import api from '@/services/api'
import { formatDate } from '@/utils/dateFormat'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'

export default {
  name: 'Dashboard',
  components: {
    ThemeToggle
  },
  setup() {
    const authStore = useAuthStore()
    const router = useRouter()
    const stats = ref({
      datasets: 0,
      prompts: 0,
      evaluations: 0
    })
    const recentEvaluations = ref([])
    const isLoading = ref(true)
    
    const user = computed(() => authStore.currentUser)
    
    const logout = () => {
      authStore.logout()
    }
    
    const fetchStats = async () => {
      try {
        isLoading.value = true
        const response = await api.get('/dashboard/stats')
        stats.value = {
          datasets: response.data.data.counts.datasets,
          prompts: response.data.data.counts.prompts,
          evaluations: response.data.data.counts.evaluations
        }
        recentEvaluations.value = response.data.data.recentEvaluations || []
      } catch (error) {
        console.error('Failed to fetch stats:', error)
        // Fallback to 0 values on error
        stats.value = {
          datasets: 0,
          prompts: 0,
          evaluations: 0
        }
        recentEvaluations.value = []
      } finally {
        isLoading.value = false
      }
    }
    
    onMounted(() => {
      fetchStats()
    })
    
    const getStatusBadgeClass = (status) => {
      switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
        case 'running': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
        case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
        case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
      }
    }
    
    const getStatusText = (status) => {
      switch (status) {
        case 'pending': return 'Pending'
        case 'running': return 'Running'
        case 'completed': return 'Completed'
        case 'failed': return 'Failed'
        default: return status
      }
    }
    
    const getAccuracyClass = (accuracy) => {
      if (accuracy >= 90) return 'text-green-600'
      if (accuracy >= 75) return 'text-green-500'
      if (accuracy >= 60) return 'text-yellow-600'
      if (accuracy >= 40) return 'text-orange-600'
      return 'text-red-600'
    }
    
    const openEvaluationDetail = (evaluationId) => {
      router.push(`/evaluations/${evaluationId}`)
    }
    
    return {
      user,
      stats,
      recentEvaluations,
      isLoading,
      logout,
      getStatusBadgeClass,
      getStatusText,
      getAccuracyClass,
      formatDate,
      openEvaluationDetail
    }
  }
}
</script>