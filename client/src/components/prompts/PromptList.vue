<template>
  <div>
    <!-- Filter and Sort Controls -->
    <FilterSortControls 
      :model-value="filters"
      @update:modelValue="filters = $event"
      :sort-options="sortOptions"
      :filters="filterOptions"
    />
    
    <div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
      <div class="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
          Prompts ({{ pagination?.total || 0 }})
        </h3>
        <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          Manage your prompt templates for model evaluation
        </p>
      </div>
    
    <!-- Loading State -->
    <div v-if="isLoading && (!prompts || prompts.length === 0)" class="p-8 text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading prompts...</p>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="!isLoading && (!prompts || prompts.length === 0)" class="p-8 text-center">
      <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
        <path d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m-16-5c-1.381 0-2.721-.087-4-.252" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No prompts</h3>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating your first prompt.</p>
    </div>
    
    <!-- Prompt List -->
    <ul v-else-if="prompts && prompts.length > 0" class="divide-y divide-gray-200 dark:divide-gray-700">
      <li v-for="prompt in prompts" :key="prompt.id">
        <div class="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700">
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <button
                    v-if="prompt.created_by === currentUserId"
                    @click="openEditModal(prompt)"
                    class="flex-shrink-0 p-1 text-gray-400 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md"
                    title="Edit prompt name"
                  >
                    <PencilIcon class="h-4 w-4" />
                  </button>
                  <h3 class="text-base font-medium text-gray-900 dark:text-white truncate">
                    {{ prompt.name || `Prompt #${prompt.id}` }}
                  </h3>
                  <span v-if="prompt.parent_prompt_id" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                    Copy
                  </span>
                </div>
                <div class="ml-2 flex-shrink-0 flex space-x-2">
                  <span v-if="prompt.maxTokens" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    {{ prompt.maxTokens }} tokens
                  </span>
                </div>
              </div>
              
              <div class="mt-1">
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Model: <span class="text-sm text-blue-600 dark:text-blue-400 truncate">{{ prompt.modelId }}</span>
                </p>
              </div>
              
              <div class="mt-2">
                <p class="text-sm text-gray-900 dark:text-gray-100 line-clamp-4">
                  {{ prompt.promptText }}
                </p>
              </div>
              
              <div class="mt-2 flex items-center justify-between">
                <div class="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
                  <span>Output Format: {{ prompt.openingTag }}...{{ prompt.closingTag }}</span>
                  <span>•</span>
                  <span>Created by <span class="text-sm text-blue-600 dark:text-blue-400 truncate">{{ prompt.created_by_username }}</span></span>
                  <span>•</span>
                  <span>{{ formatDate(prompt.created_at) }}</span>
                </div>
              </div>
              
              <div v-if="prompt.parent_prompt_name" class="mt-1">
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Based on: {{ prompt.parent_prompt_name }}
                </p>
              </div>
            </div>
            
            <div class="ml-4 flex-shrink-0 flex items-center space-x-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300">
                T: {{ prompt.temperature ?? 0.3 }}
              </span>
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                P: {{ prompt.topP ?? 0.2 }}
              </span>
              <button
                @click="$emit('view', prompt)"
                class="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                View
              </button>
              <button
                @click="$emit('edit', prompt)"
                :disabled="prompt.is_referenced_in_evaluations"
                :title="prompt.is_referenced_in_evaluations ? 'Cannot edit prompt that is referenced in existing evaluations' : 'Edit prompt'"
                :class="[
                  'inline-flex items-center px-3 py-1 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2',
                  prompt.is_referenced_in_evaluations
                    ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-indigo-500'
                ]"
              >
                Edit
              </button>
              <button
                @click="$emit('version', prompt)"
                class="inline-flex items-center px-3 py-1 border border-blue-300 dark:border-blue-700 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 dark:text-blue-300 bg-white dark:bg-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Copy
              </button>
              <button
                v-if="prompt.created_by === currentUserId"
                @click="handleDelete(prompt)"
                :disabled="prompt.is_referenced_in_evaluations"
                :title="prompt.is_referenced_in_evaluations ? 'Cannot delete prompt that is referenced in existing evaluations' : 'Delete prompt'"
                :class="[
                  'inline-flex items-center px-3 py-1 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2',
                  prompt.is_referenced_in_evaluations
                    ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
                    : 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 bg-white dark:bg-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/50 focus:ring-red-500'
                ]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </li>
    </ul>
    </div>
    
    <!-- Pagination -->
    <div v-if="pagination && pagination.totalPages > 1" class="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
      <div class="flex items-center justify-between">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="goToPreviousPage"
            :disabled="pagination.page <= 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            @click="goToNextPage"
            :disabled="pagination.page >= pagination.totalPages"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700 dark:text-gray-300">
              Showing {{ ((pagination.page - 1) * pagination.pageSize) + 1 }} to 
              {{ Math.min(pagination.page * pagination.pageSize, pagination.total) }} of 
              {{ pagination.total }} results
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                @click="goToPreviousPage"
                :disabled="pagination.page <= 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                @click="goToNextPage"
                :disabled="pagination.page >= pagination.totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Confirm Delete Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 dark:border-gray-700">
        <div class="mt-3 text-center">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">Delete Prompt</h3>
          <div class="mt-2 px-7 py-3">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete this prompt? This action cannot be undone.
            </p>
            <div class="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-left">
              <p class="text-xs font-medium text-gray-700 dark:text-gray-300">Model: <span class="text-sm text-blue-600 dark:text-blue-400 truncate">{{ promptToDelete?.modelId }}</span></p>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">{{ promptToDelete?.promptText.substring(0, 100) }}{{ promptToDelete?.promptText.length > 100 ? '...' : '' }}</p>
            </div>
          </div>
          <div class="flex justify-center space-x-3 px-4 py-3">
            <button
              @click="showDeleteModal = false"
              class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Cancel
            </button>
            <button
              ref="deleteButtonRef"
              @click="confirmDelete"
              :disabled="isDeleting"
              class="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              {{ isDeleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Name Edit Modal -->
    <NameEditModal
      :is-open="showEditModal"
      :current-name="selectedPrompt?.name || ''"
      item-type="Prompt"
      :on-save="updatePromptName"
      @close="closeEditModal"
    />
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { usePromptsStore } from '@/stores/prompts'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/utils/dateFormat'
import FilterSortControls from '@/components/common/FilterSortControls.vue'
import NameEditModal from '@/components/common/NameEditModal.vue'
import { PencilIcon } from '@heroicons/vue/24/outline'
import { useSortPreferences } from '@/composables/useSortPreferences'

export default {
  name: 'PromptList',
  components: {
    FilterSortControls,
    NameEditModal,
    PencilIcon
  },
  emits: ['view', 'edit', 'version'],
  setup(props, { emit }) {
    const promptsStore = usePromptsStore()
    const authStore = useAuthStore()
    const showDeleteModal = ref(false)
    const promptToDelete = ref(null)
    const isDeleting = ref(false)
    
    // Edit modal state
    const showEditModal = ref(false)
    const selectedPrompt = ref(null)
    
    // Delete modal ref
    const deleteButtonRef = ref(null)
    
    // Sort preferences
    const { preferences, initializeFilters } = useSortPreferences('prompts', 'created_at', 'desc')
    
    // Filter and sort state
    const filters = ref(initializeFilters({
      creator: '',
      model: '',
      has_copies: '',
      is_copy: '',
      parent_prompt: '',
      created_at_from: '',
      created_at_to: ''
    }))
    
    // Get unique creators for filter dropdown
    const creatorOptions = computed(() => {
      if (!prompts.value || prompts.value.length === 0) return []
      const creators = [...new Set(prompts.value.map(p => p.created_by_username).filter(Boolean))]
      return creators.map(creator => ({ value: creator, label: creator }))
    })
    
    // Get unique models for filter dropdown
    const modelOptions = computed(() => {
      if (!prompts.value || prompts.value.length === 0) return []
      const models = [...new Set(prompts.value.map(p => p.modelId).filter(Boolean))]
      return models.map(model => ({ value: model, label: model }))
    })
    
    // Get unique parent prompts for filter dropdown
    const parentPromptOptions = computed(() => {
      if (!prompts.value || prompts.value.length === 0) return []
      const parentPrompts = [...new Set(prompts.value.filter(p => p.parent_prompt_name).map(p => p.parent_prompt_name).filter(Boolean))]
      return parentPrompts.map(name => ({ value: name, label: name }))
    })
    
    const sortOptions = [
      { value: 'name', label: 'Name', labels: { desc: 'Z-A', asc: 'A-Z' } },
      { value: 'created_at', label: 'Creation Date', labels: { desc: 'Newest first', asc: 'Oldest first' } },
      { value: 'created_by_username', label: 'Creator', labels: { desc: 'Z-A', asc: 'A-Z' } },
      { value: 'modelId', label: 'Model', labels: { desc: 'Z-A', asc: 'A-Z' } }
    ]
    
    const filterOptions = [
      {
        key: 'creator',
        label: 'Creator',
        type: 'select',
        options: creatorOptions
      },
      {
        key: 'model',
        label: 'Model',
        type: 'select',
        options: modelOptions
      }
    ]
    
    const prompts = computed(() => promptsStore.prompts)
    const pagination = computed(() => promptsStore.pagination)
    const isLoading = computed(() => promptsStore.isLoading)
    const currentUserId = computed(() => authStore.user?.id)
    
    
    const fetchPromptsWithFilters = (page = 1, pageSize = 50) => {
      const params = {
        page,
        pageSize,
        sortBy: filters.value.sortBy,
        sortDirection: filters.value.sortDirection
      }
      
      // Add filters
      if (filters.value.creator) params.creator = filters.value.creator
      if (filters.value.model) params.model = filters.value.model
      if (filters.value.is_copy !== '') params.is_copy = filters.value.is_copy
      if (filters.value.parent_prompt) params.parent_prompt = filters.value.parent_prompt
      if (filters.value.created_at_from) params.created_at_from = filters.value.created_at_from
      if (filters.value.created_at_to) params.created_at_to = filters.value.created_at_to
      
      promptsStore.fetchPrompts(params)
    }
    
    
    const goToPreviousPage = () => {
      if (pagination.value && pagination.value.page > 1) {
        fetchPromptsWithFilters(pagination.value.page - 1, pagination.value.pageSize)
      }
    }
    
    const goToNextPage = () => {
      if (pagination.value && pagination.value.page < pagination.value.totalPages) {
        fetchPromptsWithFilters(pagination.value.page + 1, pagination.value.pageSize)
      }
    }
    
    const handleDelete = (prompt) => {
      promptToDelete.value = prompt
      showDeleteModal.value = true
      
      // Focus delete button when modal opens
      nextTick(() => {
        if (deleteButtonRef.value) {
          deleteButtonRef.value.focus()
        }
      })
    }
    
    const confirmDelete = async () => {
      if (!promptToDelete.value) return
      
      isDeleting.value = true
      try {
        await promptsStore.deletePrompt(promptToDelete.value.id)
        showDeleteModal.value = false
        promptToDelete.value = null
      } catch (error) {
        // Error handling is done in the store
      } finally {
        isDeleting.value = false
      }
    }
    
    // Edit modal functions
    const openEditModal = (prompt) => {
      selectedPrompt.value = prompt
      showEditModal.value = true
    }
    
    const closeEditModal = () => {
      showEditModal.value = false
      selectedPrompt.value = null
    }
    
    const updatePromptName = async (newName) => {
      if (!selectedPrompt.value) return
      
      await promptsStore.updatePromptName(selectedPrompt.value.id, newName)
      // Refresh the list to show updated name
      fetchPromptsWithFilters(pagination.value?.page || 1, pagination.value?.pageSize || 50)
    }
    
    // Fetch initial data
    onMounted(() => {
      fetchPromptsWithFilters()
      initialLoadDone.value = true
    })
    
    // Track if initial load is done to avoid double fetching
    const initialLoadDone = ref(false)
    
    // Watch for filter changes and automatically fetch data
    watch(filters, (newFilters) => {
      if (initialLoadDone.value) {
        // Update sort preferences when sortBy or sortDirection changes
        if (newFilters.sortBy !== preferences.value.sortBy || newFilters.sortDirection !== preferences.value.sortDirection) {
          preferences.value.sortBy = newFilters.sortBy
          preferences.value.sortDirection = newFilters.sortDirection
        }
        fetchPromptsWithFilters(1) // Reset to page 1 when filters change
      }
    }, { deep: true })
    
    return {
      prompts,
      pagination,
      isLoading,
      currentUserId,
      showDeleteModal,
      promptToDelete,
      isDeleting,
      showEditModal,
      selectedPrompt,
      filters,
      sortOptions,
      filterOptions,
      formatDate,
      goToPreviousPage,
      goToNextPage,
      handleDelete,
      confirmDelete,
      openEditModal,
      closeEditModal,
      updatePromptName,
      deleteButtonRef
    }
  }
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>