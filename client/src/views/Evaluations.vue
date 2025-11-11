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
                class="border-indigo-500 text-gray-900 dark:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
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
        <div class="mb-6">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Evaluations</h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Run and manage prompt evaluations against your datasets
              </p>
            </div>
            <button
              @click="showCreateForm = true"
              :disabled="!canCreateEvaluation"
              class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Evaluation
            </button>
          </div>
          
          <!-- Prerequisites Warning -->
          <div v-if="!canCreateEvaluation" class="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <div class="flex">
              <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <div class="text-sm">
                <p class="font-medium text-yellow-800 dark:text-yellow-300">Prerequisites Required</p>
                <p class="text-yellow-700 dark:text-yellow-300 mt-1">
                  To create evaluations, you need at least one dataset and one prompt. 
                  <router-link to="/datasets" class="underline hover:text-yellow-600 dark:hover:text-yellow-400">Upload a dataset</router-link> and/or
                  <router-link to="/prompts" class="underline hover:text-yellow-600 dark:hover:text-yellow-400">Create a prompt</router-link>.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div class="flex">
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
              <div class="mt-1 text-sm text-red-700 dark:text-red-300">{{ error }}</div>
            </div>
            <div class="ml-auto">
              <button
                @click="clearError"
                class="text-red-400 hover:text-red-600"
              >
                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Create Form -->
          <div v-if="showCreateForm" class="lg:col-span-1">
            <EvaluationForm
              :available-prompts="prompts"
              :available-datasets="availableDatasets"
              @submit="handleFormSubmit"
              @cancel="handleFormCancel"
            />
          </div>
          
          <!-- Evaluations List -->
          <div :class="['lg:col-span-2', { 'lg:col-span-3': !showCreateForm }]">
            <EvaluationList
              @view="handleViewEvaluation"
              @start="handleStartEvaluation"
            />
          </div>
        </div>

        <!-- Evaluation Detail Modal -->
        <EvaluationDetail
          v-if="viewingEvaluationId"
          :evaluation-id="viewingEvaluationId"
          @close="closeEvaluationDetail"
        />
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRoute, useRouter } from 'vue-router'
import { useEvaluationsStore } from '@/stores/evaluations'
import { usePromptsStore } from '@/stores/prompts'
import { useDatasetsStore } from '@/stores/datasets'
import EvaluationForm from '@/components/evaluations/EvaluationForm.vue'
import EvaluationList from '@/components/evaluations/EvaluationList.vue'
// Using complete version with ALL functionality restored
import EvaluationDetail from '@/components/evaluations/EvaluationDetailComplete.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'

export default {
  name: 'Evaluations',
  components: {
    EvaluationForm,
    EvaluationList,
    EvaluationDetail,
    ThemeToggle
  },
  setup() {
    const authStore = useAuthStore()
    const evaluationsStore = useEvaluationsStore()
    const promptsStore = usePromptsStore()
    const datasetsStore = useDatasetsStore()
    const route = useRoute()
    const router = useRouter()
    
    const showCreateForm = ref(false)
    const viewingEvaluationId = ref(null)
    const activeConnections = ref(new Set()) // Track active SSE connections
    
    const user = computed(() => authStore.currentUser)
    const evaluations = computed(() => evaluationsStore.evaluations)
    const prompts = computed(() => promptsStore.prompts)
    const datasets = computed(() => datasetsStore.datasets)
    const error = computed(() => evaluationsStore.error)
    
    const availableDatasets = computed(() => {
      return datasets.value.filter(dataset => dataset.message_count > 0)
    })
    
    const canCreateEvaluation = computed(() => {
      return prompts.value.length > 0 && availableDatasets.value.length > 0
    })
    
    const logout = () => authStore.logout()
    
    const clearError = () => {
      evaluationsStore.clearError()
    }
    
    const handleFormSubmit = async (evaluation) => {
      // Form submission is handled by the form component
      // Just close the form on success and refresh the list
      showCreateForm.value = false
      // Refresh to page 1 to ensure we see the new evaluation
      await evaluationsStore.fetchEvaluations(1)
    }
    
    const handleFormCancel = () => {
      showCreateForm.value = false
      evaluationsStore.clearError()
    }
    
    const handleViewEvaluation = async (evaluation) => {
      console.log('[DEBUG] handleViewEvaluation called with:', evaluation)
      // Clear any previous evaluation data before opening new one
      evaluationsStore.clearCurrentEvaluation()
      // Add a small delay to ensure proper cleanup and prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 50))
      // Set the viewing ID which will trigger the modal to show
      console.log('[DEBUG] Setting viewingEvaluationId to:', evaluation.id)
      viewingEvaluationId.value = evaluation.id
      console.log('[DEBUG] viewingEvaluationId is now:', viewingEvaluationId.value)
    }
    
    const handleStartEvaluation = async (evaluation) => {
      try {
        await evaluationsStore.startEvaluation(evaluation.id)
        // Optionally show a success message or open the detail view
        viewingEvaluationId.value = evaluation.id
      } catch (error) {
        // Error is handled by the store
        console.error('Failed to start evaluation:', error)
      }
    }
    
    
    const closeEvaluationDetail = async () => {
      viewingEvaluationId.value = null
      // Don't clear the current evaluation immediately - let the modal handle cleanup
      // Navigate back to evaluations list if we came from a direct link
      if (route.params.id) {
        router.push('/evaluations')
      }
      
      // Refresh the evaluation list data to reflect any changes
      await evaluationsStore.fetchEvaluations()
    }

    // Monitor evaluations for running status and manage SSE connections
    const updateSSEConnections = () => {
      if (!evaluations.value) return

      const runningEvaluations = evaluations.value.filter(e => e.status === 'running')
      const runningIds = new Set(runningEvaluations.map(e => e.id))

      // Start connections for new running evaluations
      runningIds.forEach(id => {
        if (!activeConnections.value.has(id)) {
          activeConnections.value.add(id)
          evaluationsStore.startStreaming(id)
        }
      })

      // Stop connections for evaluations that are no longer running
      activeConnections.value.forEach(id => {
        if (!runningIds.has(id)) {
          activeConnections.value.delete(id)
          evaluationsStore.stopStreaming(id)
        }
      })
    }
    
    // Watch for route changes to handle direct evaluation links
    watch(() => route.params.id, (evaluationId) => {
      if (evaluationId) {
        viewingEvaluationId.value = parseInt(evaluationId)
      }
    }, { immediate: true })

    // Watch evaluations for changes and update SSE connections
    watch(evaluations, updateSSEConnections, { deep: true })
    
    // Load data on mount
    onMounted(async () => {
      try {
        // Load all required data in parallel
        await Promise.all([
          evaluationsStore.fetchEvaluations(),
          promptsStore.fetchPrompts(),
          datasetsStore.fetchDatasets()
        ])
        
        // If there's an evaluation ID in the route, open the modal
        if (route.params.id) {
          viewingEvaluationId.value = parseInt(route.params.id)
        }

        // Initialize SSE connections for any running evaluations
        updateSSEConnections()
      } catch (error) {
        console.error('Failed to load data:', error)
      }
    })

    // Clean up SSE connections when component unmounts
    onUnmounted(() => {
      activeConnections.value.forEach((id) => {
        evaluationsStore.stopStreaming(id)
      })
      activeConnections.value.clear()
    })
    
    return {
      user,
      evaluations,
      prompts,
      datasets,
      availableDatasets,
      error,
      showCreateForm,
      viewingEvaluationId,
      canCreateEvaluation,
      logout,
      clearError,
      handleFormSubmit,
      handleFormCancel,
      handleViewEvaluation,
      handleStartEvaluation,
      closeEvaluationDetail
    }
  }
}
</script>