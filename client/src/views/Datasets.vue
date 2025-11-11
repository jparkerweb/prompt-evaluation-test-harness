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
                class="border-indigo-500 text-gray-900 dark:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
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
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Datasets</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Upload and manage labeled datasets for prompt evaluation
          </p>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="mb-6 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
          <div class="flex">
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <div class="mt-1 text-sm text-red-700 dark:text-red-300">{{ error }}</div>
            </div>
            <div class="ml-auto">
              <button
                @click="clearError"
                class="text-red-400 hover:text-red-600 dark:text-red-300 dark:hover:text-red-100"
              >
                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Upload Section -->
          <div class="lg:col-span-1">
            <DatasetUpload @uploaded="handleUploadSuccess" />
          </div>
          
          <!-- Datasets List -->
          <div class="lg:col-span-2">
            <DatasetList @view="handleViewDataset" />
          </div>
        </div>

        <!-- Dataset Detail Modal -->
        <DatasetDetail
          v-if="selectedDataset"
          :dataset="selectedDataset"
          @close="closeDatasetDetail"
          @deleting-message="isDeletingMessage = $event"
        />
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDatasetsStore } from '@/stores/datasets'
import DatasetUpload from '@/components/datasets/DatasetUpload.vue'
import DatasetList from '@/components/datasets/DatasetList.vue'
import DatasetDetail from '@/components/datasets/DatasetDetail.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'

export default {
  name: 'Datasets',
  components: {
    DatasetUpload,
    DatasetList,
    DatasetDetail,
    ThemeToggle
  },
  setup() {
    const authStore = useAuthStore()
    const datasetsStore = useDatasetsStore()
    const selectedDatasetId = ref(null)
    const isDeletingMessage = ref(false)
    
    const user = computed(() => authStore.currentUser)
    const error = computed(() => datasetsStore.error)
    
    // Compute the selected dataset from the ID to maintain reactivity
    const selectedDataset = computed(() => {
      if (!selectedDatasetId.value) return null
      return datasetsStore.datasets.find(d => d.id === selectedDatasetId.value) || datasetsStore.currentDataset
    })
    
    const logout = () => authStore.logout()
    
    const clearError = () => {
      datasetsStore.clearError()
    }
    
    const handleUploadSuccess = () => {
      // Datasets list will automatically refresh via the store
    }
    
    const handleViewDataset = (dataset) => {
      selectedDatasetId.value = dataset.id
      // Also set it in the store to ensure we have the full dataset data
      datasetsStore.currentDataset = dataset
    }
    
    const closeDatasetDetail = async () => {
      if (isDeletingMessage.value) {
        // Prevent modal from closing during message deletion
        return
      }
      
      selectedDatasetId.value = null
      datasetsStore.clearCurrentDataset()
      
      // Refresh the datasets list to ensure counts are up to date
      // This is necessary in case there were changes made to message counts
      try {
        await datasetsStore.fetchDatasets()
      } catch (error) {
        console.error('Failed to refresh datasets:', error)
      }
    }
    
    // Load datasets on mount
    onMounted(async () => {
      try {
        await datasetsStore.fetchDatasets()
      } catch (error) {
        console.error('Failed to load datasets:', error)
      }
    })
    
    return {
      user,
      error,
      selectedDataset,
      isDeletingMessage,
      logout,
      clearError,
      handleUploadSuccess,
      handleViewDataset,
      closeDatasetDetail
    }
  }
}
</script>