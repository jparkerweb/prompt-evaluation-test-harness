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
          Datasets ({{ pagination?.total || 0 }})
        </h3>
        <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          Manage your labeled datasets for prompt evaluation
        </p>
      </div>
    
    <!-- Loading State -->
    <div v-if="isLoading && (!datasets || datasets.length === 0)" class="p-8 text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading datasets...</p>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="!isLoading && (!datasets || datasets.length === 0)" class="p-8 text-center">
      <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
        <path d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No datasets</h3>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by uploading your first dataset.</p>
    </div>
    
    <!-- Dataset List -->
    <ul v-else-if="datasets && datasets.length > 0" class="divide-y divide-gray-200 dark:divide-gray-700">
      <li v-for="dataset in datasets" :key="dataset.id">
        <div class="px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700">
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <button
                  v-if="dataset.created_by === currentUserId"
                  @click="openEditModal(dataset)"
                  class="flex-shrink-0 p-1 text-gray-400 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md"
                  title="Edit dataset name"
                >
                  <PencilIcon class="h-4 w-4" />
                </button>
                <p class="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                  {{ dataset.name }}
                </p>
              </div>
              <div class="ml-2 flex-shrink-0 flex">
                <p class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                  {{ dataset.message_count }} messages
                </p>
              </div>
            </div>
            <div class="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
              <span>Created by <span class="text-sm text-blue-600 dark:text-blue-400 truncate">{{ dataset.created_by_username }}</span></span>
              <span class="mx-2">•</span>
              <span>{{ formatDate(dataset.created_at) }}</span>
            </div>
          </div>
          
          <div class="ml-4 flex-shrink-0 flex space-x-2">
            <button
              @click="$emit('view', dataset)"
              class="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              View
            </button>
            <button
              v-if="dataset.created_by === currentUserId"
              @click="handleDelete(dataset)"
              :disabled="dataset.is_referenced_in_evaluations"
              :title="dataset.is_referenced_in_evaluations ? 'Cannot delete dataset that is referenced in existing evaluations' : 'Delete dataset'"
              :class="[
                'inline-flex items-center px-3 py-1 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2',
                dataset.is_referenced_in_evaluations
                  ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
                  : 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 bg-white dark:bg-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/50 focus:ring-red-500'
              ]"
            >
              Delete
            </button>
          </div>
        </div>
      </li>
    </ul>
    
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
    </div>
    
    <!-- Confirm Delete Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 dark:border-gray-700">
        <div class="mt-3 text-center">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">Delete Dataset</h3>
          <div class="mt-2 px-7 py-3">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete "{{ datasetToDelete?.name }}"? This action cannot be undone.
            </p>
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
      :current-name="selectedDataset?.name || ''"
      item-type="Dataset"
      :on-save="updateDatasetName"
      @close="closeEditModal"
    />
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useDatasetsStore } from '@/stores/datasets'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/utils/dateFormat'
import FilterSortControls from '@/components/common/FilterSortControls.vue'
import NameEditModal from '@/components/common/NameEditModal.vue'
import { PencilIcon } from '@heroicons/vue/24/outline'
import { useSortPreferences } from '@/composables/useSortPreferences'

export default {
  name: 'DatasetList',
  components: {
    FilterSortControls,
    NameEditModal,
    PencilIcon
  },
  emits: ['view'],
  setup(props, { emit }) {
    const datasetsStore = useDatasetsStore()
    const authStore = useAuthStore()
    const showDeleteModal = ref(false)
    const datasetToDelete = ref(null)
    const isDeleting = ref(false)
    
    // Edit modal state
    const showEditModal = ref(false)
    const selectedDataset = ref(null)
    
    // Delete modal ref
    const deleteButtonRef = ref(null)
    
    // Sort preferences
    const { preferences, initializeFilters } = useSortPreferences('datasets', 'created_at', 'desc')
    
    // Filter and sort state
    const filters = ref(initializeFilters({
      creator: '',
      message_count_min: '',
      message_count_max: '',
      created_at_from: '',
      created_at_to: ''
    }))
    
    // Get unique creators for filter dropdown
    const creatorOptions = computed(() => {
      if (!datasets.value || datasets.value.length === 0) return []
      const creators = [...new Set(datasets.value.map(d => d.created_by_username).filter(Boolean))]
      return creators.map(creator => ({ value: creator, label: creator }))
    })
    
    const sortOptions = [
      { value: 'name', label: 'Name', labels: { desc: 'Z-A', asc: 'A-Z' } },
      { value: 'created_at', label: 'Creation Date', labels: { desc: 'Newest first', asc: 'Oldest first' } },
      { value: 'message_count', label: 'Message Count', labels: { desc: 'Most messages', asc: 'Least messages' } },
      { value: 'created_by_username', label: 'Creator', labels: { desc: 'Z-A', asc: 'A-Z' } }
    ]
    
    const filterOptions = [
      {
        key: 'creator',
        label: 'Creator',
        type: 'select',
        options: creatorOptions
      }
    ]
    
    const datasets = computed(() => datasetsStore.datasets)
    const pagination = computed(() => datasetsStore.pagination)
    const isLoading = computed(() => datasetsStore.isLoading)
    const currentUserId = computed(() => authStore.user?.id)
    
    
    const fetchDatasetsWithFilters = (page = 1, pageSize = 50) => {
      const params = {
        page,
        pageSize,
        sortBy: filters.value.sortBy,
        sortDirection: filters.value.sortDirection
      }
      
      // Add filters
      if (filters.value.creator) params.creator = filters.value.creator
      if (filters.value.message_count_min) params.message_count_min = filters.value.message_count_min
      if (filters.value.message_count_max) params.message_count_max = filters.value.message_count_max
      if (filters.value.created_at_from) params.created_at_from = filters.value.created_at_from
      if (filters.value.created_at_to) params.created_at_to = filters.value.created_at_to
      
      datasetsStore.fetchDatasets(params)
    }
    
    
    const goToPreviousPage = () => {
      if (pagination.value && pagination.value.page > 1) {
        fetchDatasetsWithFilters(pagination.value.page - 1, pagination.value.pageSize)
      }
    }
    
    const goToNextPage = () => {
      if (pagination.value && pagination.value.page < pagination.value.totalPages) {
        fetchDatasetsWithFilters(pagination.value.page + 1, pagination.value.pageSize)
      }
    }
    
    const handleDelete = (dataset) => {
      datasetToDelete.value = dataset
      showDeleteModal.value = true
      
      // Focus delete button when modal opens
      nextTick(() => {
        if (deleteButtonRef.value) {
          deleteButtonRef.value.focus()
        }
      })
    }
    
    const confirmDelete = async () => {
      if (!datasetToDelete.value) return
      
      isDeleting.value = true
      try {
        await datasetsStore.deleteDataset(datasetToDelete.value.id)
        showDeleteModal.value = false
        datasetToDelete.value = null
      } catch (error) {
        // Error handling is done in the store
      } finally {
        isDeleting.value = false
      }
    }
    
    // Edit modal functions
    const openEditModal = (dataset) => {
      selectedDataset.value = dataset
      showEditModal.value = true
    }
    
    const closeEditModal = () => {
      showEditModal.value = false
      selectedDataset.value = null
    }
    
    const updateDatasetName = async (newName) => {
      if (!selectedDataset.value) return
      
      await datasetsStore.updateDatasetName(selectedDataset.value.id, newName)
      // Refresh the list to show updated name
      fetchDatasetsWithFilters(pagination.value?.page || 1, pagination.value?.pageSize || 50)
    }
    
    // Fetch initial data
    onMounted(() => {
      fetchDatasetsWithFilters()
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
        fetchDatasetsWithFilters(1) // Reset to page 1 when filters change
      }
    }, { deep: true })
    
    return {
      datasets,
      pagination,
      isLoading,
      currentUserId,
      showDeleteModal,
      datasetToDelete,
      isDeleting,
      showEditModal,
      selectedDataset,
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
      updateDatasetName,
      deleteButtonRef
    }
  }
}
</script>