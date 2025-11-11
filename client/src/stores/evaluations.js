import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { useAuthStore } from './auth'

export const useEvaluationsStore = defineStore('evaluations', () => {
  // State
  const evaluations = ref([])
  const currentEvaluation = ref(null)
  const currentResults = ref([])
  const currentStats = ref(null)
  const activeLLMCalls = ref(new Set()) // Track active LLM calls by message ID
  const pagination = ref({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0
  })
  const resultsPagination = ref({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0
  })
  const isLoading = ref(false)
  const isSaving = ref(false)
  const isStarting = ref(false)
  const error = ref(null)

  // Getters
  const isEvaluationRunning = computed(() => {
    return currentEvaluation.value?.status === 'running'
  })

  const isEvaluationCompleted = computed(() => {
    return currentEvaluation.value?.status === 'completed'
  })

  const evaluationProgress = computed(() => {
    if (!currentEvaluation.value) return 0
    const { processed_messages, total_messages } = currentEvaluation.value
    if (!total_messages) return 0
    return Math.round((processed_messages / total_messages) * 100)
  })

  // Actions
  const fetchEvaluations = async (params = {}) => {
    isLoading.value = true
    error.value = null

    // Set defaults
    const queryParams = {
      page: 1,
      pageSize: 50,
      sortBy: 'created_at',
      sortDirection: 'desc',
      ...params
    }

    try {
      const response = await api.get('/evaluations', {
        params: queryParams
      })

      evaluations.value = response.data.data
      pagination.value = response.data.pagination
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch evaluations'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchEvaluationById = async (id) => {
    console.log('🔄 Fetching evaluation ID:', id)
    isLoading.value = true
    error.value = null

    try {
      const response = await api.get(`/evaluations/${id}`)
      
      // Ensure we have valid data
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response format')
      }
      
      currentEvaluation.value = response.data.data
      console.log('✅ Evaluation loaded:', response.data.data.name, 'ID:', response.data.data.id)
      return currentEvaluation.value
    } catch (err) {
      console.error('❌ Failed to fetch evaluation:', err.message)
      if (err.code === 'ECONNABORTED') {
        error.value = 'Request timed out. Please try again.'
      } else {
        error.value = err.response?.data?.message || err.message || 'Failed to fetch evaluation'
      }
      return null
    } finally {
      isLoading.value = false
    }
  }

  const createEvaluation = async (evaluationData) => {
    isSaving.value = true
    error.value = null

    try {
      const response = await api.post('/evaluations', evaluationData)
      const newEvaluation = response.data.data

      // Add to the beginning of the list
      evaluations.value.unshift(newEvaluation)
      
      return newEvaluation
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to create evaluation'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  const startEvaluation = async (id) => {
    isStarting.value = true
    error.value = null

    try {
      const response = await api.post(`/evaluations/${id}/start`)
      const updatedEvaluation = response.data.data

      // Update the evaluation in the list
      const index = evaluations.value.findIndex(e => e.id === id)
      if (index !== -1) {
        evaluations.value[index] = updatedEvaluation
      }

      // Always update current evaluation for start operation (user is viewing this evaluation)
      currentEvaluation.value = updatedEvaluation

      return updatedEvaluation
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to start evaluation'
      throw err
    } finally {
      isStarting.value = false
    }
  }

  const fetchEvaluationResults = async (id, page = 1, pageSize = 50) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await api.get(`/evaluations/${id}/results`, {
        params: { page, pageSize }
      })

      currentResults.value = response.data.data
      resultsPagination.value = response.data.pagination
      return currentResults.value
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch evaluation results'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchEvaluationStats = async (id) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await api.get(`/evaluations/${id}/stats`)
      currentStats.value = response.data.data
      return currentStats.value
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch evaluation stats'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const deleteEvaluation = async (id) => {
    error.value = null

    try {
      await api.delete(`/evaluations/${id}`)

      // Remove from the list
      evaluations.value = evaluations.value.filter(e => e.id !== id)

      // Clear current evaluation if it's the deleted one
      if (currentEvaluation.value?.id === id) {
        currentEvaluation.value = null
        currentResults.value = []
        currentStats.value = null
      }
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to delete evaluation'
      throw err
    }
  }

  const updateEvaluationName = async (id, name) => {
    error.value = null

    try {
      const response = await api.patch(`/evaluations/${id}/name`, { name })

      // Update local state
      const index = evaluations.value.findIndex(evaluation => evaluation.id === id)
      if (index !== -1) {
        evaluations.value[index].name = name
      }

      // Update current evaluation if it's the one being edited
      if (currentEvaluation.value?.id === id) {
        currentEvaluation.value.name = name
      }

      return response.data.evaluation
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to update evaluation name'
      throw err
    }
  }

  const validateEvaluationStatus = async (id) => {
    error.value = null

    try {
      const response = await api.get(`/evaluations/${id}/status`)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to validate evaluation status'
      throw err
    }
  }

  const stopEvaluation = async (id) => {
    error.value = null

    try {
      const response = await api.post(`/evaluations/${id}/stop`)
      
      // Refresh the evaluation data
      await refreshEvaluation(id)

      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to stop evaluation'
      throw err
    }
  }

  const pauseEvaluation = async (id) => {
    error.value = null

    try {
      const response = await api.post(`/evaluations/${id}/stop`)
      
      // Stop streaming when paused
      stopStreaming()
      
      // Refresh the evaluation data
      await refreshEvaluation(id)

      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to pause evaluation'
      throw err
    }
  }

  const resetEvaluation = async (id) => {
    error.value = null

    try {
      const response = await api.post(`/evaluations/${id}/reset`)
      
      // Refresh the evaluation data
      await refreshEvaluation(id)

      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to reset evaluation'
      throw err
    }
  }

  const resumeEvaluation = async (id) => {
    isStarting.value = true
    error.value = null

    try {
      const response = await api.post(`/evaluations/${id}/resume`)
      const updatedEvaluation = response.data.evaluation

      // Update the evaluation in the list
      const index = evaluations.value.findIndex(e => e.id === id)
      if (index !== -1) {
        evaluations.value[index] = updatedEvaluation
      }

      // Update current evaluation if it's the same one
      if (currentEvaluation.value?.id === id) {
        currentEvaluation.value = updatedEvaluation
      }

      return updatedEvaluation
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to resume evaluation'
      throw err
    } finally {
      isStarting.value = false
    }
  }

  const retryErrors = async (id) => {
    isStarting.value = true
    error.value = null

    try {
      const response = await api.post(`/evaluations/${id}/retry-errors`)
      const updatedEvaluation = response.data.data

      // Update the evaluation in the list
      const index = evaluations.value.findIndex(e => e.id === id)
      if (index !== -1) {
        evaluations.value[index] = updatedEvaluation
      }

      // Update current evaluation if it's the same one
      if (currentEvaluation.value?.id === id) {
        currentEvaluation.value = updatedEvaluation
      }

      return updatedEvaluation
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to retry errors'
      throw err
    } finally {
      isStarting.value = false
    }
  }

  const rerunEvaluation = async (id) => {
    isStarting.value = true
    error.value = null

    try {
      const response = await api.post(`/evaluations/${id}/rerun`)
      const newEvaluation = response.data.data

      // Start streaming for the new evaluation
      startStreaming(newEvaluation.id)

      // Update current evaluation to the new one
      currentEvaluation.value = newEvaluation

      return newEvaluation
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to rerun evaluation'
      throw err
    } finally {
      isStarting.value = false
    }
  }

  const refreshEvaluation = async (id) => {
    if (currentEvaluation.value?.id === id) {
      await fetchEvaluationById(id)
    }
    
    // Also refresh the evaluation in the list
    const index = evaluations.value.findIndex(e => e.id === id)
    if (index !== -1) {
      try {
        const response = await api.get(`/evaluations/${id}`)
        evaluations.value[index] = response.data.data
      } catch (err) {
        // Silently fail for list refresh
        console.error('Failed to refresh evaluation in list:', err)
      }
    }
  }

  const clearCurrentEvaluation = () => {
    currentEvaluation.value = null
    currentResults.value = []
    currentStats.value = null
    // Reset loading state when clearing
    isLoading.value = false
  }

  const clearError = () => {
    error.value = null
  }

  // Server-Sent Events for real-time evaluation updates
  // Map to handle multiple SSE connections
  const eventSources = new Map()

  const startStreaming = (id) => {
    // Close existing connection for this ID if any
    if (eventSources.has(id)) {
      eventSources.get(id).close()
      eventSources.delete(id)
    }

    // Get auth token from auth store
    const authStore = useAuthStore()
    const token = authStore.token
    
    if (!token) {
      console.error('No auth token available for SSE connection')
      return
    }

    // Create new EventSource connection with auth token as query parameter
    const eventSource = new EventSource(`/api/evaluations/${id}/stream?token=${encodeURIComponent(token)}`)
    eventSources.set(id, eventSource)
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'evaluation':
          case 'complete':
            // Update current evaluation ONLY if it matches the streaming ID
            if (currentEvaluation.value?.id == id) {
              currentEvaluation.value = data.data
            }
            
            // Update evaluation in the list
            const index = evaluations.value.findIndex(e => e.id == id)
            if (index !== -1) {
              evaluations.value[index] = data.data
            }
            
            // If evaluation completed, close the connection and clear active calls
            if (data.type === 'complete') {
              activeLLMCalls.value.clear()
              stopStreaming(id)
            }
            break
            
          case 'llm_call_start':
            // Add message ID to active calls
            if (data.messageId) {
              activeLLMCalls.value.add(data.messageId)
            }
            break
            
          case 'llm_call_complete':
            // Remove message ID from active calls
            if (data.messageId) {
              activeLLMCalls.value.delete(data.messageId)
            }
            break
            
          case 'llm_batch_start':
            // Could optionally handle batch start events
            console.log(`Starting batch of ${data.batchSize} LLM calls`)
            break
            
          case 'error':
            console.error('SSE error:', data.error)
            stopStreaming()
            break
        }
      } catch (err) {
        console.error('Failed to parse SSE data:', err)
      }
    }
    
    eventSource.onerror = (error) => {
      console.error('SSE connection error for ID', id, ':', error)
      stopStreaming(id)
    }
  }

  const stopStreaming = (id) => {
    if (id && eventSources.has(id)) {
      eventSources.get(id).close()
      eventSources.delete(id)
    } else if (!id) {
      // Stop all connections if no ID provided
      eventSources.forEach((source, streamId) => {
        source.close()
      })
      eventSources.clear()
    }
    // Clear active LLM calls when stopping
    activeLLMCalls.value.clear()
  }

  // Legacy polling methods for backward compatibility
  const startPolling = (id) => {
    startStreaming(id)
  }

  const stopPolling = (id) => {
    stopStreaming(id)
  }

  return {
    // State
    evaluations,
    currentEvaluation,
    currentResults,
    currentStats,
    activeLLMCalls,
    pagination,
    resultsPagination,
    isLoading,
    isSaving,
    isStarting,
    error,
    
    // Getters
    isEvaluationRunning,
    isEvaluationCompleted,
    evaluationProgress,
    
    // Actions
    fetchEvaluations,
    fetchEvaluationById,
    createEvaluation,
    startEvaluation,
    fetchEvaluationResults,
    fetchEvaluationStats,
    deleteEvaluation,
    updateEvaluationName,
    validateEvaluationStatus,
    stopEvaluation,
    pauseEvaluation,
    resetEvaluation,
    resumeEvaluation,
    retryErrors,
    rerunEvaluation,
    refreshEvaluation,
    clearCurrentEvaluation,
    clearError,
    startPolling,
    stopPolling,
    startStreaming,
    stopStreaming
  }
})