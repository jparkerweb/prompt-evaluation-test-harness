import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEvaluationsStore } from './evaluations'
import { useAuthStore } from './auth'
import api from '@/services/api'

// Mock the API service
vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}))

// Mock the auth store
const mockAuthStore = {
  token: 'test-token'
}
vi.mock('./auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore)
}))

// Mock EventSource
class MockEventSource {
  constructor(url) {
    this.url = url
    this.onmessage = null
    this.onerror = null
    MockEventSource.instances.push(this)
  }

  close() {
    MockEventSource.instances = MockEventSource.instances.filter(instance => instance !== this)
  }

  static instances = []
  static reset() {
    MockEventSource.instances = []
  }
}

global.EventSource = MockEventSource

describe('Evaluations Store', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useEvaluationsStore()
    vi.clearAllMocks()
    MockEventSource.reset()
  })

  afterEach(() => {
    vi.clearAllMocks()
    MockEventSource.reset()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.evaluations).toEqual([])
      expect(store.currentEvaluation).toBeNull()
      expect(store.currentResults).toEqual([])
      expect(store.currentStats).toBeNull()
      expect(store.activeLLMCalls).toEqual(new Set())
      expect(store.pagination).toEqual({
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 0
      })
      expect(store.resultsPagination).toEqual({
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 0
      })
      expect(store.isLoading).toBe(false)
      expect(store.isSaving).toBe(false)
      expect(store.isStarting).toBe(false)
      expect(store.error).toBeNull()
    })
  })

  describe('Getters', () => {
    it('should return correct isEvaluationRunning status', () => {
      store.currentEvaluation = { status: 'running' }
      expect(store.isEvaluationRunning).toBe(true)

      store.currentEvaluation = { status: 'completed' }
      expect(store.isEvaluationRunning).toBe(false)

      store.currentEvaluation = null
      expect(store.isEvaluationRunning).toBe(false)
    })

    it('should return correct isEvaluationCompleted status', () => {
      store.currentEvaluation = { status: 'completed' }
      expect(store.isEvaluationCompleted).toBe(true)

      store.currentEvaluation = { status: 'running' }
      expect(store.isEvaluationCompleted).toBe(false)

      store.currentEvaluation = null
      expect(store.isEvaluationCompleted).toBe(false)
    })

    it('should calculate correct evaluation progress', () => {
      store.currentEvaluation = {
        processed_messages: 25,
        total_messages: 100
      }
      expect(store.evaluationProgress).toBe(25)

      store.currentEvaluation = {
        processed_messages: 0,
        total_messages: 100
      }
      expect(store.evaluationProgress).toBe(0)

      store.currentEvaluation = {
        processed_messages: 100,
        total_messages: 100
      }
      expect(store.evaluationProgress).toBe(100)

      store.currentEvaluation = {
        processed_messages: 10,
        total_messages: 0
      }
      expect(store.evaluationProgress).toBe(0)

      store.currentEvaluation = null
      expect(store.evaluationProgress).toBe(0)
    })
  })

  describe('FetchEvaluations Action', () => {
    it('should fetch evaluations successfully with default params', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: 1, name: 'Evaluation 1', status: 'completed' },
            { id: 2, name: 'Evaluation 2', status: 'running' }
          ],
          pagination: {
            page: 1,
            pageSize: 50,
            total: 2,
            totalPages: 1
          }
        }
      }
      api.get.mockResolvedValue(mockResponse)

      await store.fetchEvaluations()

      expect(api.get).toHaveBeenCalledWith('/evaluations', {
        params: {
          page: 1,
          pageSize: 50,
          sortBy: 'created_at',
          sortDirection: 'desc'
        }
      })
      expect(store.evaluations).toEqual(mockResponse.data.data)
      expect(store.pagination).toEqual(mockResponse.data.pagination)
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('should fetch evaluations with custom params', async () => {
      const customParams = {
        page: 2,
        pageSize: 25,
        sortBy: 'name',
        sortDirection: 'asc'
      }
      const mockResponse = {
        data: {
          data: [],
          pagination: { page: 2, pageSize: 25, total: 0, totalPages: 0 }
        }
      }
      api.get.mockResolvedValue(mockResponse)

      await store.fetchEvaluations(customParams)

      expect(api.get).toHaveBeenCalledWith('/evaluations', {
        params: customParams
      })
    })

    it('should handle fetch evaluations error', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch evaluations'
          }
        }
      }
      api.get.mockRejectedValue(mockError)

      await expect(store.fetchEvaluations()).rejects.toThrow()

      expect(store.error).toBe('Failed to fetch evaluations')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('FetchEvaluationById Action', () => {
    it('should fetch evaluation by ID successfully', async () => {
      const mockResponse = {
        data: {
          data: { id: 1, name: 'Evaluation 1', status: 'completed' }
        }
      }
      api.get.mockResolvedValue(mockResponse)

      const result = await store.fetchEvaluationById(1)

      expect(api.get).toHaveBeenCalledWith('/evaluations/1')
      expect(store.currentEvaluation).toEqual(mockResponse.data.data)
      expect(result).toEqual(mockResponse.data.data)
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('should handle invalid response format', async () => {
      const mockResponse = { data: null }
      api.get.mockResolvedValue(mockResponse)

      const result = await store.fetchEvaluationById(1)

      expect(result).toBeNull()
      expect(store.error).toBe('Invalid response format')
      expect(store.isLoading).toBe(false)
    })

    it('should handle timeout error', async () => {
      const mockError = { code: 'ECONNABORTED' }
      api.get.mockRejectedValue(mockError)

      const result = await store.fetchEvaluationById(1)

      expect(result).toBeNull()
      expect(store.error).toBe('Request timed out. Please try again.')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('CreateEvaluation Action', () => {
    it('should create evaluation successfully', async () => {
      const evaluationData = {
        name: 'New Evaluation',
        promptId: 1,
        datasetId: 1
      }
      const mockResponse = {
        data: {
          data: { id: 1, name: 'New Evaluation', status: 'pending' }
        }
      }
      api.post.mockResolvedValue(mockResponse)

      const result = await store.createEvaluation(evaluationData)

      expect(api.post).toHaveBeenCalledWith('/evaluations', evaluationData)
      expect(store.evaluations[0]).toEqual(mockResponse.data.data)
      expect(result).toEqual(mockResponse.data.data)
      expect(store.error).toBeNull()
      expect(store.isSaving).toBe(false)
    })

    it('should handle create evaluation error', async () => {
      const evaluationData = { name: 'New Evaluation' }
      const mockError = {
        response: {
          data: {
            message: 'Missing required fields'
          }
        }
      }
      api.post.mockRejectedValue(mockError)

      await expect(store.createEvaluation(evaluationData)).rejects.toThrow()

      expect(store.error).toBe('Missing required fields')
      expect(store.isSaving).toBe(false)
    })
  })

  describe('StartEvaluation Action', () => {
    it('should start evaluation successfully', async () => {
      store.evaluations = [{ id: 1, name: 'Evaluation 1', status: 'pending' }]
      
      const mockResponse = {
        data: {
          data: { id: 1, name: 'Evaluation 1', status: 'running' }
        }
      }
      api.post.mockResolvedValue(mockResponse)

      const result = await store.startEvaluation(1)

      expect(api.post).toHaveBeenCalledWith('/evaluations/1/start')
      expect(store.evaluations[0].status).toBe('running')
      expect(store.currentEvaluation).toEqual(mockResponse.data.data)
      expect(result).toEqual(mockResponse.data.data)
      expect(store.error).toBeNull()
      expect(store.isStarting).toBe(false)
    })
  })

  describe('FetchEvaluationResults Action', () => {
    it('should fetch evaluation results successfully', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: 1, messageId: 1, response: 'Response 1', correct: true },
            { id: 2, messageId: 2, response: 'Response 2', correct: false }
          ],
          pagination: {
            page: 1,
            pageSize: 50,
            total: 2,
            totalPages: 1
          }
        }
      }
      api.get.mockResolvedValue(mockResponse)

      const result = await store.fetchEvaluationResults(1, 1, 50)

      expect(api.get).toHaveBeenCalledWith('/evaluations/1/results', {
        params: { page: 1, pageSize: 50 }
      })
      expect(store.currentResults).toEqual(mockResponse.data.data)
      expect(store.resultsPagination).toEqual(mockResponse.data.pagination)
      expect(result).toEqual(mockResponse.data.data)
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })
  })

  describe('FetchEvaluationStats Action', () => {
    it('should fetch evaluation stats successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            accuracy: 0.85,
            totalMessages: 100,
            correctMessages: 85
          }
        }
      }
      api.get.mockResolvedValue(mockResponse)

      const result = await store.fetchEvaluationStats(1)

      expect(api.get).toHaveBeenCalledWith('/evaluations/1/stats')
      expect(store.currentStats).toEqual(mockResponse.data.data)
      expect(result).toEqual(mockResponse.data.data)
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })
  })

  describe('DeleteEvaluation Action', () => {
    it('should delete evaluation successfully', async () => {
      store.evaluations = [
        { id: 1, name: 'Evaluation 1' },
        { id: 2, name: 'Evaluation 2' }
      ]
      store.currentEvaluation = { id: 1, name: 'Evaluation 1' }
      store.currentResults = [{ id: 1, response: 'Response' }]
      store.currentStats = { accuracy: 0.5 }

      api.delete.mockResolvedValue({})

      await store.deleteEvaluation(1)

      expect(api.delete).toHaveBeenCalledWith('/evaluations/1')
      expect(store.evaluations).toEqual([{ id: 2, name: 'Evaluation 2' }])
      expect(store.currentEvaluation).toBeNull()
      expect(store.currentResults).toEqual([])
      expect(store.currentStats).toBeNull()
      expect(store.error).toBeNull()
    })
  })

  describe('UpdateEvaluationName Action', () => {
    it('should update evaluation name successfully', async () => {
      store.evaluations = [{ id: 1, name: 'Old Name' }]
      store.currentEvaluation = { id: 1, name: 'Old Name' }

      const mockResponse = {
        data: {
          evaluation: { id: 1, name: 'New Name' }
        }
      }
      api.patch.mockResolvedValue(mockResponse)

      const result = await store.updateEvaluationName(1, 'New Name')

      expect(api.patch).toHaveBeenCalledWith('/evaluations/1/name', { name: 'New Name' })
      expect(store.evaluations[0].name).toBe('New Name')
      expect(store.currentEvaluation.name).toBe('New Name')
      expect(result).toEqual(mockResponse.data.evaluation)
      expect(store.error).toBeNull()
    })
  })

  describe('ValidateEvaluationStatus Action', () => {
    it('should validate evaluation status successfully', async () => {
      const mockResponse = {
        data: { status: 'running', valid: true }
      }
      api.get.mockResolvedValue(mockResponse)

      const result = await store.validateEvaluationStatus(1)

      expect(api.get).toHaveBeenCalledWith('/evaluations/1/status')
      expect(result).toEqual(mockResponse.data)
      expect(store.error).toBeNull()
    })
  })

  describe('StopEvaluation Action', () => {
    it('should stop evaluation successfully', async () => {
      const mockResponse = { data: { success: true } }
      api.post.mockResolvedValue(mockResponse)
      
      // Mock refreshEvaluation to avoid actual API call
      api.get.mockResolvedValue({ data: { id: 1, status: 'stopped' } })

      const result = await store.stopEvaluation(1)

      expect(api.post).toHaveBeenCalledWith('/evaluations/1/stop')
      expect(result).toEqual(mockResponse.data)
      expect(store.error).toBeNull()
    })
  })

  describe('PauseEvaluation Action', () => {
    it('should pause evaluation successfully', async () => {
      const mockResponse = { data: { success: true } }
      api.post.mockResolvedValue(mockResponse)
      
      // Mock refreshEvaluation to avoid actual API call
      api.get.mockResolvedValue({ data: { id: 1, status: 'paused' } })

      const result = await store.pauseEvaluation(1)

      expect(api.post).toHaveBeenCalledWith('/evaluations/1/stop')
      expect(result).toEqual(mockResponse.data)
      expect(store.error).toBeNull()
    })
  })

  describe('ResetEvaluation Action', () => {
    it('should reset evaluation successfully', async () => {
      const mockResponse = { data: { success: true } }
      api.post.mockResolvedValue(mockResponse)
      
      // Mock refreshEvaluation to avoid actual API call
      api.get.mockResolvedValue({ data: { id: 1, status: 'reset' } })

      const result = await store.resetEvaluation(1)

      expect(api.post).toHaveBeenCalledWith('/evaluations/1/reset')
      expect(result).toEqual(mockResponse.data)
      expect(store.error).toBeNull()
    })
  })

  describe('ResumeEvaluation Action', () => {
    it('should resume evaluation successfully', async () => {
      store.evaluations = [{ id: 1, name: 'Evaluation 1', status: 'paused' }]
      store.currentEvaluation = { id: 1, name: 'Evaluation 1', status: 'paused' }

      const mockResponse = {
        data: {
          evaluation: { id: 1, name: 'Evaluation 1', status: 'running' }
        }
      }
      api.post.mockResolvedValue(mockResponse)

      const result = await store.resumeEvaluation(1)

      expect(api.post).toHaveBeenCalledWith('/evaluations/1/resume')
      expect(store.evaluations[0].status).toBe('running')
      expect(store.currentEvaluation.status).toBe('running')
      expect(result).toEqual(mockResponse.data.evaluation)
      expect(store.error).toBeNull()
      expect(store.isStarting).toBe(false)
    })
  })

  describe('RetryErrors Action', () => {
    it('should retry errors successfully', async () => {
      store.evaluations = [{ id: 1, name: 'Evaluation 1', status: 'error' }]
      store.currentEvaluation = { id: 1, name: 'Evaluation 1', status: 'error' }

      const mockResponse = {
        data: {
          data: { id: 1, name: 'Evaluation 1', status: 'running' }
        }
      }
      api.post.mockResolvedValue(mockResponse)

      const result = await store.retryErrors(1)

      expect(api.post).toHaveBeenCalledWith('/evaluations/1/retry-errors')
      expect(store.evaluations[0].status).toBe('running')
      expect(store.currentEvaluation.status).toBe('running')
      expect(result).toEqual(mockResponse.data.data)
      expect(store.error).toBeNull()
      expect(store.isStarting).toBe(false)
    })
  })

  describe('RerunEvaluation Action', () => {
    it('should rerun evaluation successfully', async () => {
      const mockResponse = {
        data: {
          data: { id: 2, name: 'Evaluation 1 (Rerun)', status: 'running' }
        }
      }
      api.post.mockResolvedValue(mockResponse)

      const result = await store.rerunEvaluation(1)

      expect(api.post).toHaveBeenCalledWith('/evaluations/1/rerun')
      expect(store.currentEvaluation).toEqual(mockResponse.data.data)
      expect(result).toEqual(mockResponse.data.data)
      expect(store.error).toBeNull()
      expect(store.isStarting).toBe(false)
    })
  })

  describe('RefreshEvaluation Action', () => {
    it('should refresh current evaluation', async () => {
      store.currentEvaluation = { id: 1, name: 'Evaluation 1' }
      
      // Mock the API call that fetchEvaluationById would make
      api.get.mockResolvedValue({ data: { id: 1, name: 'Updated Evaluation' } })

      await store.refreshEvaluation(1)

      expect(api.get).toHaveBeenCalledWith('/evaluations/1')
    })

    it('should refresh evaluation in list', async () => {
      store.evaluations = [{ id: 1, name: 'Old Name' }]
      
      const mockResponse = {
        data: {
          data: { id: 1, name: 'Updated Name' }
        }
      }
      api.get.mockResolvedValue(mockResponse)

      await store.refreshEvaluation(1)

      expect(store.evaluations[0].name).toBe('Updated Name')
    })

    it('should handle refresh error silently for list', async () => {
      store.evaluations = [{ id: 1, name: 'Evaluation 1' }]
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      api.get.mockRejectedValue(new Error('Network error'))

      await store.refreshEvaluation(1)

      expect(consoleSpy).toHaveBeenCalledWith('Failed to refresh evaluation in list:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('ClearCurrentEvaluation Action', () => {
    it('should clear current evaluation data', () => {
      store.currentEvaluation = { id: 1, name: 'Evaluation 1' }
      store.currentResults = [{ id: 1, response: 'Response' }]
      store.currentStats = { accuracy: 0.5 }
      store.isLoading = true

      store.clearCurrentEvaluation()

      expect(store.currentEvaluation).toBeNull()
      expect(store.currentResults).toEqual([])
      expect(store.currentStats).toBeNull()
      expect(store.isLoading).toBe(false)
    })
  })

  describe('ClearError Action', () => {
    it('should clear error', () => {
      store.error = 'Some error'
      store.clearError()
      expect(store.error).toBeNull()
    })
  })

  describe('SSE Streaming', () => {
    it('should start streaming with auth token', () => {
      store.startStreaming(1)

      expect(MockEventSource.instances).toHaveLength(1)
      expect(MockEventSource.instances[0].url).toBe('/api/evaluations/1/stream?token=test-token')
    })

    it('should not start streaming without auth token', () => {
      mockAuthStore.token = null
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      store.startStreaming(1)

      expect(MockEventSource.instances).toHaveLength(0)
      expect(consoleSpy).toHaveBeenCalledWith('No auth token available for SSE connection')
      
      consoleSpy.mockRestore()
      // Reset token for other tests
      mockAuthStore.token = 'test-token'
    })

    it('should close existing connection when starting new one', () => {
      store.startStreaming(1)
      const firstInstance = MockEventSource.instances[0]
      
      store.startStreaming(1)
      
      expect(MockEventSource.instances).toHaveLength(1)
      expect(MockEventSource.instances[0]).not.toBe(firstInstance)
    })

    it('should handle evaluation update message', () => {
      store.currentEvaluation = { id: 1, name: 'Evaluation 1', status: 'running' }
      store.evaluations = [{ id: 1, name: 'Evaluation 1', status: 'running' }]
      
      store.startStreaming(1)
      const eventSource = MockEventSource.instances[0]

      const updateData = {
        type: 'evaluation',
        data: { id: 1, name: 'Evaluation 1', status: 'running', processed_messages: 10 }
      }

      eventSource.onmessage({ data: JSON.stringify(updateData) })

      expect(store.currentEvaluation.processed_messages).toBe(10)
      expect(store.evaluations[0].processed_messages).toBe(10)
    })

    it('should handle complete message and close connection', () => {
      store.currentEvaluation = { id: 1, name: 'Evaluation 1', status: 'running' }
      store.evaluations = [{ id: 1, name: 'Evaluation 1', status: 'running' }]
      store.activeLLMCalls.add('message1')
      
      store.startStreaming(1)
      const eventSource = MockEventSource.instances[0]

      const completeData = {
        type: 'complete',
        data: { id: 1, name: 'Evaluation 1', status: 'completed' }
      }

      eventSource.onmessage({ data: JSON.stringify(completeData) })

      expect(store.currentEvaluation.status).toBe('completed')
      expect(store.evaluations[0].status).toBe('completed')
      expect(store.activeLLMCalls.size).toBe(0)
      expect(MockEventSource.instances).toHaveLength(0)
    })

    it('should handle LLM call start message', () => {
      store.startStreaming(1)
      const eventSource = MockEventSource.instances[0]

      const startData = {
        type: 'llm_call_start',
        messageId: 'message1'
      }

      eventSource.onmessage({ data: JSON.stringify(startData) })

      expect(store.activeLLMCalls.has('message1')).toBe(true)
    })

    it('should handle LLM call complete message', () => {
      store.activeLLMCalls.add('message1')
      
      store.startStreaming(1)
      const eventSource = MockEventSource.instances[0]

      const completeData = {
        type: 'llm_call_complete',
        messageId: 'message1'
      }

      eventSource.onmessage({ data: JSON.stringify(completeData) })

      expect(store.activeLLMCalls.has('message1')).toBe(false)
    })

    it('should handle LLM batch start message', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      store.startStreaming(1)
      const eventSource = MockEventSource.instances[0]

      const batchData = {
        type: 'llm_batch_start',
        batchSize: 5
      }

      eventSource.onmessage({ data: JSON.stringify(batchData) })

      expect(consoleSpy).toHaveBeenCalledWith('Starting batch of 5 LLM calls')
      
      consoleSpy.mockRestore()
    })

    it('should handle error message', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      store.startStreaming(1)
      const eventSource = MockEventSource.instances[0]

      const errorData = {
        type: 'error',
        error: 'Something went wrong'
      }

      eventSource.onmessage({ data: JSON.stringify(errorData) })

      expect(consoleSpy).toHaveBeenCalledWith('SSE error:', 'Something went wrong')
      expect(MockEventSource.instances).toHaveLength(0)
      
      consoleSpy.mockRestore()
    })

    it('should handle invalid JSON in SSE message', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      store.startStreaming(1)
      const eventSource = MockEventSource.instances[0]

      eventSource.onmessage({ data: 'invalid json' })

      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse SSE data:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should handle connection error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      store.startStreaming(1)
      const eventSource = MockEventSource.instances[0]

      eventSource.onerror('Connection error')

      expect(consoleSpy).toHaveBeenCalledWith('SSE connection error for ID', 1, ':', 'Connection error')
      expect(MockEventSource.instances).toHaveLength(0)
      
      consoleSpy.mockRestore()
    })

    it('should stop streaming for specific ID', () => {
      store.startStreaming(1)
      store.startStreaming(2)
      store.activeLLMCalls.add('message1')

      expect(MockEventSource.instances).toHaveLength(2)

      store.stopStreaming(1)

      expect(MockEventSource.instances).toHaveLength(1)
      expect(store.activeLLMCalls.size).toBe(0)
    })

    it('should stop all streaming when no ID provided', () => {
      store.startStreaming(1)
      store.startStreaming(2)
      store.activeLLMCalls.add('message1')

      expect(MockEventSource.instances).toHaveLength(2)

      store.stopStreaming()

      expect(MockEventSource.instances).toHaveLength(0)
      expect(store.activeLLMCalls.size).toBe(0)
    })
  })

  describe('Legacy Polling Methods', () => {
    it('should call startStreaming for startPolling', () => {
      // Test that the method exists and can be called without error
      expect(() => store.startPolling(1)).not.toThrow()
    })

    it('should call stopStreaming for stopPolling', () => {
      // Test that the method exists and can be called without error
      expect(() => store.stopPolling(1)).not.toThrow()
    })
  })

  describe('Loading States', () => {
    it('should manage loading state during fetch', async () => {
      let resolveFetch
      api.get.mockImplementation(() => new Promise(resolve => {
        resolveFetch = resolve
      }))

      const fetchPromise = store.fetchEvaluations()
      
      expect(store.isLoading).toBe(true)
      
      resolveFetch({ data: { data: [], pagination: {} } })
      await fetchPromise
      
      expect(store.isLoading).toBe(false)
    })

    it('should manage saving state during create', async () => {
      let resolveCreate
      api.post.mockImplementation(() => new Promise(resolve => {
        resolveCreate = resolve
      }))

      const createPromise = store.createEvaluation({ name: 'Test' })
      
      expect(store.isSaving).toBe(true)
      
      resolveCreate({ data: { data: {} } })
      await createPromise
      
      expect(store.isSaving).toBe(false)
    })

    it('should manage starting state during start', async () => {
      let resolveStart
      api.post.mockImplementation(() => new Promise(resolve => {
        resolveStart = resolve
      }))

      const startPromise = store.startEvaluation(1)
      
      expect(store.isStarting).toBe(true)
      
      resolveStart({ data: { data: {} } })
      await startPromise
      
      expect(store.isStarting).toBe(false)
    })
  })
})