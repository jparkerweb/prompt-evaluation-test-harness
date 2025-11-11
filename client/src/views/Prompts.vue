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
                class="border-indigo-500 text-gray-900 dark:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
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
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Prompts</h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Create and manage prompt templates for model evaluation
              </p>
            </div>
            <button
              @click="showCreateForm = true"
              class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Prompt
            </button>
          </div>
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
          <!-- Create/Edit Form -->
          <div v-if="showCreateForm || editingPrompt" class="lg:col-span-1">
            <PromptForm
              :prompt="editingPrompt"
              :available-prompts="prompts"
              @submit="handleFormSubmit"
              @cancel="handleFormCancel"
            />
          </div>
          
          <!-- Prompts List -->
          <div :class="['lg:col-span-2', { 'lg:col-span-3': !showCreateForm && !editingPrompt }]">
            <PromptList
              @view="handleViewPrompt"
              @edit="handleEditPrompt"
              @version="handleCreateVersion"
            />
          </div>
        </div>

        <!-- Prompt Detail Modal -->
        <PromptDetail
          v-if="viewingPromptId"
          :prompt-id="viewingPromptId"
          @close="closePromptDetail"
          @edit="handleEditFromDetail"
          @version="handleCreateVersionFromDetail"
          @view-version="handleViewPrompt"
          @edit-version="handleEditPrompt"
        />
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePromptsStore } from '@/stores/prompts'
import PromptForm from '@/components/prompts/PromptForm.vue'
import PromptList from '@/components/prompts/PromptList.vue'
import PromptDetail from '@/components/prompts/PromptDetail.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'

export default {
  name: 'Prompts',
  components: {
    PromptForm,
    PromptList,
    PromptDetail,
    ThemeToggle
  },
  setup() {
    const authStore = useAuthStore()
    const promptsStore = usePromptsStore()
    const showCreateForm = ref(false)
    const editingPrompt = ref(null)
    const viewingPromptId = ref(null)
    
    const user = computed(() => authStore.currentUser)
    const prompts = computed(() => promptsStore.prompts)
    const error = computed(() => promptsStore.error)
    
    const logout = () => authStore.logout()
    
    const clearError = () => {
      promptsStore.clearError()
    }
    
    const handleFormSubmit = async (prompt) => {
      // Form submission is handled by the form component
      // Just close the form on success and refresh the list to show the new prompt
      showCreateForm.value = false
      editingPrompt.value = null
      // Refresh to page 1 to ensure we see the new prompt (since they're sorted by creation date desc)
      await promptsStore.fetchPrompts(1)
    }
    
    const handleFormCancel = () => {
      showCreateForm.value = false
      editingPrompt.value = null
      promptsStore.clearError()
    }
    
    const handleViewPrompt = (prompt) => {
      viewingPromptId.value = prompt.id
    }
    
    const handleEditPrompt = (prompt) => {
      editingPrompt.value = prompt
      showCreateForm.value = false
      viewingPromptId.value = null
    }
    
    const handleCreateVersion = (prompt) => {
      // Create a new prompt based on the selected one, pre-filling all fields
      editingPrompt.value = {
        name: `${prompt.name || `Prompt #${prompt.id}`} (Copy)`,
        modelId: prompt.modelId,
        promptText: prompt.promptText,
        maxTokens: prompt.maxTokens,
        temperature: prompt.temperature,
        topP: prompt.topP,
        stopSequences: prompt.stopSequences ? [...prompt.stopSequences] : [],
        returnLabel: prompt.returnLabel,
        openingTag: prompt.openingTag,
        closingTag: prompt.closingTag,
        parentPromptId: prompt.id, // Set parent ID for versioning
        id: null // Clear ID to create new
      }
      showCreateForm.value = true // Show the form
      viewingPromptId.value = null
    }
    
    const closePromptDetail = () => {
      viewingPromptId.value = null
      promptsStore.clearCurrentPrompt()
    }
    
    const handleEditFromDetail = (prompt) => {
      viewingPromptId.value = null
      promptsStore.clearCurrentPrompt()
      handleEditPrompt(prompt)
    }
    
    const handleCreateVersionFromDetail = (prompt) => {
      viewingPromptId.value = null
      promptsStore.clearCurrentPrompt()
      handleCreateVersion(prompt)
    }
    
    // Load prompts on mount
    onMounted(async () => {
      try {
        await promptsStore.fetchPrompts()
      } catch (error) {
        console.error('Failed to load prompts:', error)
      }
    })
    
    return {
      user,
      prompts,
      error,
      showCreateForm,
      editingPrompt,
      viewingPromptId,
      logout,
      clearError,
      handleFormSubmit,
      handleFormCancel,
      handleViewPrompt,
      handleEditPrompt,
      handleCreateVersion,
      closePromptDetail,
      handleEditFromDetail,
      handleCreateVersionFromDetail
    }
  }
}
</script>