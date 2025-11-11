<template>
  <div
    class="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
    @click="handleBackdropClick"
  >
    <div 
      class="relative w-full max-w-6xl mx-4 h-[90vh] flex flex-col bg-white dark:bg-gray-800 rounded-md shadow-lg"
      @click.stop
    >
      <!-- Fixed Header -->
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-start">
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            {{ evaluation?.name || 'Evaluation Details' }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400" v-if="evaluation">
            ID: {{ evaluation?.id || 'Loading...' }} • 
            Created by <span class="text-sm text-blue-600 dark:text-blue-400 truncate">{{ evaluation?.created_by_username || 'Unknown' }}</span> • 
            {{ evaluation?.created_at ? formatDate(evaluation.created_at) : 'Unknown date' }}
          </p>
        </div>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Scrollable Content Area -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        <!-- Loading State -->
        <div v-if="!evaluation" class="p-8 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p class="mt-2 text-sm text-gray-500">Loading evaluation details...</p>
        </div>
        
        <!-- Evaluation Content -->
        <div v-else class="space-y-6">
          <!-- Status and Progress -->
          <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white">Status & Progress</h4>
              <button
                v-if="evaluation?.status === 'running'"
                @click="refreshEvaluation"
                class="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Refresh
              </button>
            </div>
            
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</dt>
                <dd class="mt-1">
                  <span :class="getStatusBadgeClass(evaluation?.status)" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
                    {{ getStatusText(evaluation?.status || 'unknown') }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Progress</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {{ evaluation?.processed_messages || 0 }} / {{ evaluation?.total_messages || 0 }} messages
                </dd>
              </div>
              <div v-if="evaluation?.started_at">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Started</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ formatDate(evaluation.started_at) }}</dd>
              </div>
              <div v-if="evaluation?.completed_at">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Completed</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ formatDate(evaluation.completed_at) }}</dd>
              </div>
            </div>
            
            <!-- Progress Bar -->
            <div v-if="evaluation && (evaluation.status === 'running' || evaluation.status === 'completed')" class="mt-4">
              <div class="flex items-center justify-between text-sm mb-1">
                <span class="text-gray-600 dark:text-gray-400">Processing Progress</span>
                <span class="text-gray-900 dark:text-gray-100 font-medium">{{ getProgressPercentage(evaluation) }}%</span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div 
                  class="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                  :style="{ width: `${getProgressPercentage(evaluation)}%` }"
                ></div>
              </div>
            </div>
          </div>
          
          <!-- Configuration -->
          <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Configuration</h4>
            <dl class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div>
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Prompt</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ evaluation?.prompt_name || `Prompt #${evaluation?.prompt_id || 'Unknown'}` }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Dataset</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ evaluation?.dataset_name || 'Unknown' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Model</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">{{ evaluation?.model_id || 'Unknown' }}</dd>
              </div>
              <div v-if="getEvaluationDuration(evaluation)">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Duration</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ getEvaluationDuration(evaluation) }}</dd>
              </div>
            </dl>
            
            <div v-if="evaluation?.description" class="mt-3">
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Description</dt>
              <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ evaluation.description }}</dd>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Fixed Footer Actions -->
      <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <!-- Empty space for layout balance -->
          </div>
          
          <!-- Action Buttons -->
          <div class="flex space-x-3">
            <button
              v-if="evaluation?.status === 'pending'"
              @click="handleStart"
              :disabled="isStarting"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              <span v-if="isStarting">Starting...</span>
              <span v-else>Start Evaluation</span>
            </button>
            
            <button
              v-if="evaluation?.status === 'running'"
              @click="handlePause"
              :disabled="isPausing"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
            >
              <span v-if="isPausing">Pausing...</span>
              <span v-else>Pause Evaluation</span>
            </button>
            
            <button
              v-if="evaluation && (evaluation.status === 'paused' || (evaluation.status === 'failed' && evaluation.can_resume))"
              @click="handleResume"
              :disabled="isResuming"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <span v-if="isResuming">Resuming...</span>
              <span v-else>Resume Evaluation</span>
            </button>
            
            <button
              @click="$emit('close')"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useEvaluationsStore } from '@/stores/evaluations'
import { formatDate } from '@/utils/dateFormat'

export default {
  name: 'EvaluationDetailFixed',
  props: {
    evaluationId: {
      type: Number,
      required: true
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const evaluationsStore = useEvaluationsStore()
    const evaluation = ref(null)
    
    // Action states
    const isStarting = ref(false)
    const isPausing = ref(false)
    const isResuming = ref(false)
    
    const loadEvaluationData = async () => {
      if (!props.evaluationId) return
      
      try {
        console.log('🔄 Loading evaluation:', props.evaluationId)
        const result = await evaluationsStore.fetchEvaluationById(props.evaluationId)
        evaluation.value = result
        console.log('✅ Evaluation loaded:', evaluation.value?.name)
        
        // Start streaming for running evaluations
        if (evaluation.value?.status === 'running') {
          evaluationsStore.startPolling(props.evaluationId)
        }
      } catch (error) {
        console.error('❌ Failed to load evaluation:', error)
      }
    }
    
    const getStatusBadgeClass = (status) => {
      if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
      switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
        case 'running': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
        case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
        case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
        case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
      }
    }
    
    const getStatusText = (status) => {
      if (!status) return 'Unknown'
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
      if (!evaluation || !evaluation.total_messages) return 0
      const processed = evaluation.processed_messages || 0
      return Math.round((processed / evaluation.total_messages) * 100)
    }
    
    const refreshEvaluation = async () => {
      await evaluationsStore.refreshEvaluation(props.evaluationId)
      evaluation.value = evaluationsStore.currentEvaluation
    }
    
    const handleBackdropClick = () => {
      emit('close')
    }
    
    const handleStart = async () => {
      isStarting.value = true
      try {
        await evaluationsStore.startEvaluation(props.evaluationId)
        evaluation.value = evaluationsStore.currentEvaluation
      } catch (error) {
        console.error('Failed to start evaluation:', error)
      } finally {
        isStarting.value = false
      }
    }
    
    const handlePause = async () => {
      isPausing.value = true
      try {
        await evaluationsStore.pauseEvaluation(props.evaluationId)
        evaluation.value = evaluationsStore.currentEvaluation
      } catch (error) {
        console.error('Failed to pause evaluation:', error)
      } finally {
        isPausing.value = false
      }
    }
    
    const handleResume = async () => {
      isResuming.value = true
      try {
        await evaluationsStore.resumeEvaluation(props.evaluationId)
        evaluation.value = evaluationsStore.currentEvaluation
      } catch (error) {
        console.error('Failed to resume evaluation:', error)
      } finally {
        isResuming.value = false
      }
    }
    
    // Watch for store updates (for SSE updates)
    watch(() => evaluationsStore.currentEvaluation, (newEval) => {
      if (newEval && newEval.id === props.evaluationId) {
        evaluation.value = newEval
      }
    })
    
    // Load data when component mounts or evaluationId changes
    watch(() => props.evaluationId, async (newId) => {
      if (newId) {
        await loadEvaluationData()
      }
    }, { immediate: true })
    
    // Clean up polling when component unmounts
    onUnmounted(() => {
      if (evaluation.value?.status === 'running') {
        evaluationsStore.stopPolling(props.evaluationId)
      }
    })
    
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
      evaluation,
      isStarting,
      isPausing,
      isResuming,
      formatDate,
      getStatusBadgeClass,
      getStatusText,
      getProgressPercentage,
      refreshEvaluation,
      handleBackdropClick,
      handleStart,
      handlePause,
      handleResume,
      getEvaluationDuration
    }
  }
}
</script>