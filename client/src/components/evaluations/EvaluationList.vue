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
          Evaluations ({{ pagination?.total || 0 }})
        </h3>
        <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          View and manage your prompt evaluations
        </p>
      </div>
    
    <!-- Loading State -->
    <div v-if="isLoading && (!evaluations || evaluations.length === 0)" class="p-8 text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading evaluations...</p>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="!isLoading && (!evaluations || evaluations.length === 0)" class="p-8 text-center">
      <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
        <path d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m-16-5c-1.381 0-2.721-.087-4-.252" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No evaluations</h3>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating your first evaluation.</p>
    </div>
    
    <!-- Evaluation List -->
    <ul v-else-if="evaluations && evaluations.length > 0" class="divide-y divide-gray-200 dark:divide-gray-700">
      <li v-for="evaluation in evaluations" :key="evaluation.id">
        <div class="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700">
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <button
                    v-if="evaluation.created_by === currentUserId"
                    @click="openEditModal(evaluation)"
                    class="flex-shrink-0 p-1 text-gray-400 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md"
                    title="Edit evaluation name"
                  >
                    <PencilIcon class="h-4 w-4" />
                  </button>
                  <h3 class="text-base font-medium text-gray-900 dark:text-white truncate">
                    {{ evaluation.name }}
                  </h3>
                  <span :class="getStatusBadgeClass(evaluation.status)" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
                    {{ getStatusText(evaluation.status) }}
                  </span>
                  <!-- Stuck indicator for potentially stuck evaluations -->
                  <span v-if="evaluation.status === 'running' && evaluation.failure_reason" 
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 ml-2"
                        :title="evaluation.failure_reason">
                    ⚠️ May be stuck
                  </span>
                </div>
              </div>
              
              <div class="mt-2">
                <p class="text-sm text-gray-600 dark:text-gray-300">
                  <span class="font-medium">Prompt:</span> {{ evaluation.prompt_name || `Prompt #${evaluation.prompt_id}` }}
                  <span class="mx-2">•</span>
                  <span class="font-medium">Dataset:</span> {{ evaluation.dataset_name }}
                  <span class="mx-2">•</span>
                  <span class="font-medium">Model:</span> <span class="text-sm text-blue-600 dark:text-blue-400 truncate">{{ evaluation.model_id }}</span>
                </p>
              </div>
              
              <!-- Progress Bar for Running and Paused Evaluations -->
              <div v-if="evaluation.status === 'running' || evaluation.status === 'paused'" class="mt-3">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-600 dark:text-gray-400">Progress</span>
                  <span class="text-gray-900 dark:text-white font-medium">
                    {{ evaluation.processed_messages || 0 }} / {{ evaluation.total_messages }} messages
                  </span>
                </div>
                <div class="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    class="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                    :style="{ width: `${getProgressPercentage(evaluation)}%` }"
                  ></div>
                </div>
              </div>
              
              <!-- Results Summary for Completed Evaluations -->
              <div v-else-if="evaluation.status === 'completed'" class="mt-2">
                <div class="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>{{ evaluation.processed_messages }} messages processed</span>
                  <span v-if="getEvaluationDuration(evaluation)">
                    {{ getEvaluationDuration(evaluation) }} duration
                  </span>
                  <span class="bg-orange-500 bg-opacity-10 text-orange-700 dark:bg-orange-400 dark:bg-opacity-10 dark:text-orange-400 px-1 rounded" v-if="evaluation.total_time_ms && evaluation.processed_messages">
                    {{ Math.round(evaluation.total_time_ms / Math.max(evaluation.processed_messages, 1)) }}ms avg
                  </span>
                </div>
                
                <!-- Accuracy Stats -->
                <div v-if="evaluation.accuracy !== undefined" class="mt-2 flex items-center space-x-4 text-sm">
                  <div class="flex items-center space-x-1">
                    <span class="text-gray-600 dark:text-gray-400">Accuracy:</span>
                    <span :class="getAccuracyClass(evaluation.accuracy)" class="font-semibold">
                      {{ evaluation.accuracy }}%
                    </span>
                  </div>
                  <div class="flex items-center space-x-1" v-if="(evaluation.correct_predictions || 0) > 0">
                    <span class="text-green-600 dark:text-green-400 font-medium">{{ evaluation.correct_predictions || 0 }} correct</span>
                  </div>
                  <div class="flex items-center space-x-1" v-if="(evaluation.incorrect_predictions || 0) > 0">
                    <span class="text-red-600 dark:text-red-400 font-medium">{{ evaluation.incorrect_predictions || 0 }} incorrect</span>
                  </div>
                  <div class="flex items-center space-x-1" v-if="evaluation.error_count > 0">
                    <span class="text-red-600 dark:text-red-400 font-medium">{{ evaluation.error_count }} errors</span>
                  </div>
                </div>
              </div>
              
              <div v-if="evaluation.description" class="mt-2">
                <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {{ evaluation.description }}
                </p>
              </div>
              
              <div class="mt-2 flex items-center justify-between">
                <div class="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
                  <span>Created by <span class="text-sm text-blue-600 dark:text-blue-400 truncate">{{ evaluation.created_by_username }}</span></span>
                  <span>•</span>
                  <span>{{ formatDate(evaluation.created_at) }}</span>
                  <span v-if="evaluation.started_at">•</span>
                  <span v-if="evaluation.started_at">Started {{ formatDate(evaluation.started_at) }}</span>
                </div>
              </div>
            </div>
            
            <div class="ml-4 flex-shrink-0 flex space-x-2">
              <button
                @click="$emit('view', evaluation)"
                class="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                View
              </button>
              
              <!-- Start button for pending evaluations -->
              <button
                v-if="evaluation.status === 'pending'"
                @click="$emit('start', evaluation)"
                :disabled="isStarting"
                class="inline-flex items-center px-3 py-1 border border-green-300 dark:border-green-700 shadow-sm text-sm leading-4 font-medium rounded-md text-green-700 dark:text-green-300 bg-white dark:bg-green-900/30 hover:bg-green-50 dark:hover:bg-green-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <svg v-if="isStarting" class="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isStarting ? 'Starting...' : 'Start' }}
              </button>
              
              <!-- Pause button for running evaluations -->
              <button
                v-if="evaluation.status === 'running' && evaluation.created_by === currentUserId"
                @click="handlePauseEvaluation(evaluation)"
                :disabled="processingAction"
                class="inline-flex items-center px-3 py-1 border border-yellow-300 dark:border-yellow-700 shadow-sm text-sm leading-4 font-medium rounded-md text-yellow-700 dark:text-yellow-300 bg-white dark:bg-yellow-900/30 hover:bg-yellow-50 dark:hover:bg-yellow-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
              >
                <svg v-if="processingAction" class="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else class="-ml-1 mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                {{ processingAction ? 'Pausing...' : 'Pause' }}
              </button>
              
              <!-- Resume button for failed evaluations that can be resumed -->
              <button
                v-if="(evaluation.status === 'paused' || (evaluation.status === 'failed' && evaluation.can_resume)) && evaluation.created_by === currentUserId"
                @click="handleResumeEvaluation(evaluation)"
                :disabled="isStarting || processingAction"
                class="inline-flex items-center px-3 py-1 border border-blue-300 dark:border-blue-700 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 dark:text-blue-300 bg-white dark:bg-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <svg v-if="isStarting || processingAction" class="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ (isStarting || processingAction) ? 'Resuming...' : 'Resume' }}
              </button>
              
              <!-- Rerun button for completed evaluations -->
              <button
                v-if="evaluation.status === 'completed' && evaluation.created_by === currentUserId"
                @click="handleRerunEvaluation(evaluation)"
                :disabled="processingAction"
                class="inline-flex items-center px-3 py-1 border border-green-300 dark:border-green-700 shadow-sm text-sm leading-4 font-medium rounded-md text-green-700 dark:text-green-300 bg-white dark:bg-green-900/30 hover:bg-green-50 dark:hover:bg-green-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <svg v-if="processingAction" class="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else class="-ml-1 mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                </svg>
                {{ processingAction ? 'Starting...' : 'Rerun' }}
              </button>
              
              <!-- Reset button for failed evaluations -->
              <button
                v-if="evaluation.status === 'failed' && evaluation.created_by === currentUserId"
                @click="handleResetEvaluation(evaluation)"
                :disabled="processingAction"
                class="inline-flex items-center px-3 py-1 border border-yellow-300 dark:border-yellow-700 shadow-sm text-sm leading-4 font-medium rounded-md text-yellow-700 dark:text-yellow-300 bg-white dark:bg-yellow-900/30 hover:bg-yellow-50 dark:hover:bg-yellow-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
              >
                <svg v-if="processingAction" class="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ processingAction ? 'Resetting...' : 'Reset' }}
              </button>
              
              <!-- Delete button -->
              <button
                v-if="evaluation.status !== 'running' && canDeleteEvaluation(evaluation)"
                @click="handleDelete(evaluation)"
                :disabled="processingAction"
                class="inline-flex items-center px-3 py-1 border border-red-300 dark:border-red-700 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 dark:text-red-300 bg-white dark:bg-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
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
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">Delete Evaluation</h3>
          <div class="mt-2 px-7 py-3">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete "{{ evaluationToDelete?.name }}"? This action cannot be undone.
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
      :current-name="selectedEvaluation?.name || ''"
      item-type="Evaluation"
      :on-save="updateEvaluationName"
      @close="closeEditModal"
    />
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useEvaluationsStore } from '@/stores/evaluations'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/utils/dateFormat'
import FilterSortControls from '@/components/common/FilterSortControls.vue'
import NameEditModal from '@/components/common/NameEditModal.vue'
import { PencilIcon } from '@heroicons/vue/24/outline'
import { useSortPreferences } from '@/composables/useSortPreferences'

export default {
  name: 'EvaluationList',
  components: {
    FilterSortControls,
    NameEditModal,
    PencilIcon
  },
  emits: ['view', 'start'],
  setup(props, { emit }) {
    const evaluationsStore = useEvaluationsStore()
    const authStore = useAuthStore()
    const showDeleteModal = ref(false)
    const evaluationToDelete = ref(null)
    const isDeleting = ref(false)
    const processingAction = ref(false)
    
    // Edit modal state
    const showEditModal = ref(false)
    const selectedEvaluation = ref(null)
    
    // Delete modal ref
    const deleteButtonRef = ref(null)
    
    // Sort preferences
    const { preferences, initializeFilters } = useSortPreferences('evaluations', 'created_at', 'desc')
    
    // Filter and sort state
    const filters = ref(initializeFilters({
      status: '',
      prompt: '',
      dataset: '',
      model: '',
      creator: '',
      accuracy_min: '',
      accuracy_max: '',
      processing_time_min: '',
      processing_time_max: '',
      created_at_from: '',
      created_at_to: ''
    }))
    
    // Get unique values for filter dropdowns
    const statusOptions = [
      { value: 'pending', label: 'Pending' },
      { value: 'running', label: 'Running' },
      { value: 'completed', label: 'Completed' },
      { value: 'failed', label: 'Failed' }
    ]
    
    const promptOptions = computed(() => {
      if (!evaluations.value || evaluations.value.length === 0) return []
      const prompts = [...new Set(evaluations.value.map(e => e.prompt_name).filter(Boolean))]
      return prompts.map(name => ({ value: name, label: name }))
    })
    
    const datasetOptions = computed(() => {
      if (!evaluations.value || evaluations.value.length === 0) return []
      const datasets = [...new Set(evaluations.value.map(e => e.dataset_name).filter(Boolean))]
      return datasets.map(name => ({ value: name, label: name }))
    })
    
    const modelOptions = computed(() => {
      if (!evaluations.value || evaluations.value.length === 0) return []
      const models = [...new Set(evaluations.value.map(e => e.model_id).filter(Boolean))]
      return models.map(model => ({ value: model, label: model }))
    })
    
    const creatorOptions = computed(() => {
      if (!evaluations.value || evaluations.value.length === 0) return []
      const creators = [...new Set(evaluations.value.map(e => e.created_by_username).filter(Boolean))]
      return creators.map(creator => ({ value: creator, label: creator }))
    })
    
    const sortOptions = [
      { value: 'name', label: 'Name', labels: { desc: 'Z-A', asc: 'A-Z' } },
      { value: 'created_at', label: 'Creation Date', labels: { desc: 'Newest first', asc: 'Oldest first' } },
      { value: 'accuracy', label: 'Accuracy', labels: { desc: 'Highest first', asc: 'Lowest first' } },
      { value: 'total_time_ms', label: 'Total Processing Time', labels: { desc: 'Longest first', asc: 'Shortest first' } },
      { value: 'avg_time_per_message', label: 'Average Time per Message', labels: { desc: 'Slowest first', asc: 'Fastest first' } },
      { value: 'status', label: 'Status', labels: { desc: 'Completed first', asc: 'Pending first' } }
    ]
    
    const filterOptions = [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: statusOptions
      },
      {
        key: 'prompt',
        label: 'Prompt',
        type: 'select',
        options: promptOptions
      },
      {
        key: 'dataset',
        label: 'Dataset',
        type: 'select',
        options: datasetOptions
      },
      {
        key: 'model',
        label: 'Model',
        type: 'select',
        options: modelOptions
      },
      {
        key: 'creator',
        label: 'Creator',
        type: 'select',
        options: creatorOptions
      },
      {
        key: 'accuracy',
        label: 'Accuracy (%)',
        type: 'range',
        min: 0,
        max: 100
      }
    ]
    
    const evaluations = computed(() => evaluationsStore.evaluations)
    const pagination = computed(() => evaluationsStore.pagination)
    const isLoading = computed(() => evaluationsStore.isLoading)
    const isStarting = computed(() => evaluationsStore.isStarting)
    const currentUser = computed(() => authStore.currentUser)
    const currentUserId = computed(() => authStore.user?.id)
    
    const canDeleteEvaluation = (evaluation) => {
      return currentUser.value && evaluation.created_by_username === currentUser.value.username
    }
    
    const getStatusBadgeClass = (status) => {
      switch (status) {
        case 'pending':
          return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
        case 'running':
          return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
        case 'completed':
          return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
        case 'paused':
          return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
        case 'failed':
          return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
        default:
          return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
      }
    }
    
    const getStatusText = (status) => {
      switch (status) {
        case 'pending': return 'Pending'
        case 'running': return 'Running'
        case 'completed': return 'Completed'
        case 'paused': return 'Paused'
        case 'failed': return 'Failed'
        default: return status
      }
    }
    
    const getProgressPercentage = (evaluation) => {
      if (!evaluation.total_messages) return 0
      return Math.round((evaluation.processed_messages / evaluation.total_messages) * 100)
    }
    
    const fetchEvaluationsWithFilters = (page = 1, pageSize = 50) => {
      const params = {
        page,
        pageSize,
        sortBy: filters.value.sortBy,
        sortDirection: filters.value.sortDirection
      }
      
      // Add filters
      if (filters.value.status) params.status = filters.value.status
      if (filters.value.prompt) params.prompt = filters.value.prompt
      if (filters.value.dataset) params.dataset = filters.value.dataset
      if (filters.value.model) params.model = filters.value.model
      if (filters.value.creator) params.creator = filters.value.creator
      if (filters.value.accuracy_min) params.accuracy_min = filters.value.accuracy_min
      if (filters.value.accuracy_max) params.accuracy_max = filters.value.accuracy_max
      if (filters.value.processing_time_min) params.processing_time_min = filters.value.processing_time_min
      if (filters.value.processing_time_max) params.processing_time_max = filters.value.processing_time_max
      if (filters.value.created_at_from) params.created_at_from = filters.value.created_at_from
      if (filters.value.created_at_to) params.created_at_to = filters.value.created_at_to
      
      evaluationsStore.fetchEvaluations(params)
    }
    
    
    const goToPreviousPage = () => {
      if (pagination.value && pagination.value.page > 1) {
        fetchEvaluationsWithFilters(pagination.value.page - 1, pagination.value.pageSize)
      }
    }
    
    const goToNextPage = () => {
      if (pagination.value && pagination.value.page < pagination.value.totalPages) {
        fetchEvaluationsWithFilters(pagination.value.page + 1, pagination.value.pageSize)
      }
    }
    
    const handleDelete = (evaluation) => {
      evaluationToDelete.value = evaluation
      showDeleteModal.value = true
      
      // Focus delete button when modal opens
      nextTick(() => {
        if (deleteButtonRef.value) {
          deleteButtonRef.value.focus()
        }
      })
    }
    
    const confirmDelete = async () => {
      if (!evaluationToDelete.value) return
      
      isDeleting.value = true
      try {
        await evaluationsStore.deleteEvaluation(evaluationToDelete.value.id)
        showDeleteModal.value = false
        evaluationToDelete.value = null
      } catch (error) {
        // Error handling is done in the store
      } finally {
        isDeleting.value = false
      }
    }
    
    // Edit modal functions
    const openEditModal = (evaluation) => {
      selectedEvaluation.value = evaluation
      showEditModal.value = true
    }
    
    const closeEditModal = () => {
      showEditModal.value = false
      selectedEvaluation.value = null
    }
    
    const updateEvaluationName = async (newName) => {
      if (!selectedEvaluation.value) return
      
      await evaluationsStore.updateEvaluationName(selectedEvaluation.value.id, newName)
      // Refresh the list to show updated name
      fetchEvaluationsWithFilters(pagination.value?.page || 1, pagination.value?.pageSize || 50)
    }

    // Status management handlers
    const handlePauseEvaluation = async (evaluation) => {
      processingAction.value = true
      try {
        await evaluationsStore.pauseEvaluation(evaluation.id)
        // Refresh the list to show updated status
        fetchEvaluationsWithFilters(pagination.value?.page || 1, pagination.value?.pageSize || 50)
      } catch (error) {
        console.error('Failed to pause evaluation:', error)
      } finally {
        processingAction.value = false
      }
    }

    const handleResetEvaluation = async (evaluation) => {
      processingAction.value = true
      try {
        await evaluationsStore.resetEvaluation(evaluation.id)
        // Refresh the list to show updated status
        fetchEvaluationsWithFilters(pagination.value?.page || 1, pagination.value?.pageSize || 50)
      } catch (error) {
        console.error('Failed to reset evaluation:', error)
      } finally {
        processingAction.value = false
      }
    }

    const handleResumeEvaluation = async (evaluation) => {
      try {
        await evaluationsStore.resumeEvaluation(evaluation.id)
        // Refresh the list to show updated status
        fetchEvaluationsWithFilters(pagination.value?.page || 1, pagination.value?.pageSize || 50)
      } catch (error) {
        console.error('Failed to resume evaluation:', error)
      }
    }

    const handleRerunEvaluation = async (evaluation) => {
      processingAction.value = true
      try {
        await evaluationsStore.rerunEvaluation(evaluation.id)
        // Refresh the list to show updated status
        fetchEvaluationsWithFilters(pagination.value?.page || 1, pagination.value?.pageSize || 50)
      } catch (error) {
        console.error('Failed to rerun evaluation:', error)
      } finally {
        processingAction.value = false
      }
    }

    const getAccuracyClass = (accuracy) => {
      if (accuracy >= 90) return 'text-green-600'
      if (accuracy >= 75) return 'text-green-500'
      if (accuracy >= 60) return 'text-yellow-600'
      if (accuracy >= 40) return 'text-orange-600'
      return 'text-red-600'
    }
    
    // Fetch initial data
    onMounted(() => {
      fetchEvaluationsWithFilters()
    })
    
    // Watch for filter changes and automatically fetch data
    watch(filters, (newFilters) => {
      // Update sort preferences when sortBy or sortDirection changes
      if (newFilters.sortBy !== preferences.value.sortBy || newFilters.sortDirection !== preferences.value.sortDirection) {
        preferences.value.sortBy = newFilters.sortBy
        preferences.value.sortDirection = newFilters.sortDirection
      }
      fetchEvaluationsWithFilters(1) // Reset to page 1 when filters change
    }, { deep: true })
    
    const getEvaluationDuration = (evaluation) => {
      if (!evaluation || !evaluation.started_at) return null
      
      const startTime = new Date(evaluation.started_at)
      const endTime = evaluation.completed_at ? new Date(evaluation.completed_at) : new Date()
      const durationMs = endTime - startTime
      
      if (durationMs < 0) return null
      
      const durationSeconds = Math.floor(durationMs / 1000)
      
      if (durationSeconds < 60) {
        return `${durationSeconds}s`
      } else if (durationSeconds < 3600) {
        const minutes = Math.floor(durationSeconds / 60)
        const seconds = durationSeconds % 60
        return `${minutes}m ${seconds}s`
      } else {
        const hours = Math.floor(durationSeconds / 3600)
        const minutes = Math.floor((durationSeconds % 3600) / 60)
        const seconds = durationSeconds % 60
        return `${hours}h ${minutes}m ${seconds}s`
      }
    }
    
    return {
      evaluations,
      pagination,
      isLoading,
      isStarting,
      currentUserId,
      showDeleteModal,
      evaluationToDelete,
      isDeleting,
      processingAction,
      showEditModal,
      selectedEvaluation,
      filters,
      sortOptions,
      filterOptions,
      preferences,
      formatDate,
      getStatusBadgeClass,
      getStatusText,
      getProgressPercentage,
      getAccuracyClass,
      canDeleteEvaluation,
      goToPreviousPage,
      goToNextPage,
      handleDelete,
      confirmDelete,
      openEditModal,
      closeEditModal,
      updateEvaluationName,
      handlePauseEvaluation,
      handleResetEvaluation,
      handleResumeEvaluation,
      handleRerunEvaluation,
      deleteButtonRef,
      getEvaluationDuration
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