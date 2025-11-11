import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDatasetsStore } from './datasets'
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

describe('Datasets Store', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDatasetsStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.datasets).toEqual([])
      expect(store.currentDataset).toBeNull()
      expect(store.currentMessages).toEqual([])
      expect(store.pagination).toEqual({
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 0
      })
      expect(store.messagesPagination).toEqual({
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 0
      })
      expect(store.isLoading).toBe(false)
      expect(store.isUploading).toBe(false)
      expect(store.error).toBeNull()
    })
  })

  describe('Getters', () => {
    it('should return correct datasets count', () => {
      store.datasets = [
        { id: 1, name: 'Dataset 1' },
        { id: 2, name: 'Dataset 2' }
      ]
      expect(store.getDatasetsCount).toBe(2)
    })

    it('should return correct total messages', () => {
      store.datasets = [
        { id: 1, name: 'Dataset 1', message_count: 10 },
        { id: 2, name: 'Dataset 2', message_count: 20 },
        { id: 3, name: 'Dataset 3' } // no message_count
      ]
      expect(store.getTotalMessages).toBe(30)
    })

    it('should handle datasets without message_count', () => {
      store.datasets = [
        { id: 1, name: 'Dataset 1' },
        { id: 2, name: 'Dataset 2' }
      ]
      expect(store.getTotalMessages).toBe(0)
    })
  })

  describe('FetchDatasets Action', () => {
    it('should fetch datasets successfully with default params', async () => {
      const mockResponse = {
        data: {
          datasets: [
            { id: 1, name: 'Dataset 1', message_count: 10 },
            { id: 2, name: 'Dataset 2', message_count: 20 }
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

      await store.fetchDatasets()

      expect(api.get).toHaveBeenCalledWith('/datasets', {
        params: {
          page: 1,
          pageSize: 50,
          sortBy: 'created_at',
          sortDirection: 'desc'
        }
      })
      expect(store.datasets).toEqual(mockResponse.data.datasets)
      expect(store.pagination).toEqual(mockResponse.data.pagination)
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('should fetch datasets with custom params', async () => {
      const customParams = {
        page: 2,
        pageSize: 25,
        sortBy: 'name',
        sortDirection: 'asc'
      }
      const mockResponse = {
        data: {
          datasets: [],
          pagination: { page: 2, pageSize: 25, total: 0, totalPages: 0 }
        }
      }
      api.get.mockResolvedValue(mockResponse)

      await store.fetchDatasets(customParams)

      expect(api.get).toHaveBeenCalledWith('/datasets', {
        params: customParams
      })
    })

    it('should handle fetch datasets error', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Failed to fetch datasets'
            }
          }
        }
      }
      api.get.mockRejectedValue(mockError)

      await expect(store.fetchDatasets()).rejects.toThrow()

      expect(store.error).toBe('Failed to fetch datasets')
      expect(store.isLoading).toBe(false)
    })

    it('should handle fetch datasets error without specific message', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(store.fetchDatasets()).rejects.toThrow()

      expect(store.error).toBe('Failed to fetch datasets')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('CreateDataset Action', () => {
    it('should create dataset successfully', async () => {
      const mockFile = new File(['content'], 'test.jsonl', { type: 'application/json' })
      const mockResponse = {
        data: {
          dataset: { id: 1, name: 'New Dataset', message_count: 5 }
        }
      }
      api.post.mockResolvedValue(mockResponse)
      
      // Mock fetchDatasets to avoid actual API call
      const fetchDatasetsSpy = vi.spyOn(store, 'fetchDatasets').mockResolvedValue()

      const result = await store.createDataset('New Dataset', mockFile)

      expect(api.post).toHaveBeenCalledWith('/datasets', expect.any(FormData), {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      expect(fetchDatasetsSpy).toHaveBeenCalled()
      expect(result).toEqual(mockResponse.data.dataset)
      expect(store.error).toBeNull()
      expect(store.isUploading).toBe(false)
    })

    it('should handle create dataset error', async () => {
      const mockFile = new File(['content'], 'test.jsonl', { type: 'application/json' })
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Invalid file format'
            }
          }
        }
      }
      api.post.mockRejectedValue(mockError)

      await expect(store.createDataset('New Dataset', mockFile)).rejects.toThrow()

      expect(store.error).toBe('Invalid file format')
      expect(store.isUploading).toBe(false)
    })
  })

  describe('FetchDatasetById Action', () => {
    it('should fetch dataset by ID successfully', async () => {
      const mockResponse = {
        data: { id: 1, name: 'Dataset 1', message_count: 10 }
      }
      api.get.mockResolvedValue(mockResponse)

      const result = await store.fetchDatasetById(1)

      expect(api.get).toHaveBeenCalledWith('/datasets/1')
      expect(store.currentDataset).toEqual(mockResponse.data)
      expect(result).toEqual(mockResponse.data)
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('should handle fetch dataset by ID error', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Dataset not found'
            }
          }
        }
      }
      api.get.mockRejectedValue(mockError)

      await expect(store.fetchDatasetById(999)).rejects.toThrow()

      expect(store.error).toBe('Dataset not found')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('FetchDatasetMessages Action', () => {
    it('should fetch dataset messages successfully', async () => {
      const mockResponse = {
        data: {
          messages: [
            { id: 1, messageContent: 'Message 1', label: true },
            { id: 2, messageContent: 'Message 2', label: false }
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

      await store.fetchDatasetMessages(1, 1, 50)

      expect(api.get).toHaveBeenCalledWith('/datasets/1/messages', {
        params: { page: 1, pageSize: 50 }
      })
      expect(store.currentMessages).toEqual(mockResponse.data.messages)
      expect(store.messagesPagination).toEqual(mockResponse.data.pagination)
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })
  })

  describe('DeleteDataset Action', () => {
    it('should delete dataset successfully', async () => {
      store.datasets = [
        { id: 1, name: 'Dataset 1' },
        { id: 2, name: 'Dataset 2' }
      ]
      store.currentDataset = { id: 1, name: 'Dataset 1' }
      store.currentMessages = [{ id: 1, messageContent: 'Message 1' }]

      api.delete.mockResolvedValue({})

      await store.deleteDataset(1)

      expect(api.delete).toHaveBeenCalledWith('/datasets/1')
      expect(store.datasets).toEqual([{ id: 2, name: 'Dataset 2' }])
      expect(store.currentDataset).toBeNull()
      expect(store.currentMessages).toEqual([])
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('should not clear current dataset if different ID deleted', async () => {
      store.datasets = [
        { id: 1, name: 'Dataset 1' },
        { id: 2, name: 'Dataset 2' }
      ]
      store.currentDataset = { id: 2, name: 'Dataset 2' }

      api.delete.mockResolvedValue({})

      await store.deleteDataset(1)

      expect(store.datasets).toEqual([{ id: 2, name: 'Dataset 2' }])
      expect(store.currentDataset).toEqual({ id: 2, name: 'Dataset 2' })
    })
  })

  describe('UpdateDatasetName Action', () => {
    it('should update dataset name successfully', async () => {
      store.datasets = [
        { id: 1, name: 'Old Name' },
        { id: 2, name: 'Dataset 2' }
      ]
      store.currentDataset = { id: 1, name: 'Old Name' }

      const mockResponse = {
        data: {
          dataset: { id: 1, name: 'New Name' }
        }
      }
      api.patch.mockResolvedValue(mockResponse)

      const result = await store.updateDatasetName(1, 'New Name')

      expect(api.patch).toHaveBeenCalledWith('/datasets/1/name', { name: 'New Name' })
      expect(store.datasets[0].name).toBe('New Name')
      expect(store.currentDataset.name).toBe('New Name')
      expect(result).toEqual(mockResponse.data.dataset)
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })
  })

  describe('CreateDatasetMessage Action', () => {
    it('should create dataset message successfully', async () => {
      store.currentDataset = { id: 1, message_count: 10 }
      store.datasets = [{ id: 1, message_count: 10 }]
      store.messagesPagination = { total: 10 }

      const mockResponse = {
        data: {
          data: { id: 1, label: true, messageContent: 'New message' }
        }
      }
      api.post.mockResolvedValue(mockResponse)

      const result = await store.createDatasetMessage(1, true, 'New message')

      expect(api.post).toHaveBeenCalledWith('/datasets/1/messages', {
        label: true,
        messageContent: 'New message'
      })
      expect(store.messagesPagination.total).toBe(11)
      expect(store.currentDataset.message_count).toBe(11)
      expect(store.datasets[0].message_count).toBe(11)
      expect(result).toEqual(mockResponse.data.data)
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })
  })

  describe('UpdateDatasetMessage Action', () => {
    it('should update dataset message successfully', async () => {
      store.currentMessages = [
        { id: 1, label: false, messageContent: 'Old message' },
        { id: 2, label: true, messageContent: 'Message 2' }
      ]

      const mockResponse = {
        data: {
          data: { id: 1, label: true, messageContent: 'Updated message' }
        }
      }
      api.patch.mockResolvedValue(mockResponse)

      const result = await store.updateDatasetMessage(1, 1, true, 'Updated message')

      expect(api.patch).toHaveBeenCalledWith('/datasets/1/messages/1', {
        label: true,
        messageContent: 'Updated message'
      })
      expect(store.currentMessages[0].label).toBe(true)
      expect(store.currentMessages[0].messageContent).toBe('Updated message')
      expect(result).toEqual(mockResponse.data.data)
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })
  })

  describe('DeleteDatasetMessage Action', () => {
    it('should delete dataset message successfully', async () => {
      store.currentMessages = [
        { id: 1, messageContent: 'Message 1' },
        { id: 2, messageContent: 'Message 2' }
      ]
      store.messagesPagination = { total: 2 }
      store.currentDataset = { id: 1, message_count: 2 }
      store.datasets = [{ id: 1, message_count: 2 }]

      api.delete.mockResolvedValue({})

      await store.deleteDatasetMessage(1, 1)

      expect(api.delete).toHaveBeenCalledWith('/datasets/1/messages/1')
      expect(store.currentMessages).toEqual([{ id: 2, messageContent: 'Message 2' }])
      expect(store.messagesPagination.total).toBe(1)
      expect(store.currentDataset.message_count).toBe(1)
      expect(store.datasets[0].message_count).toBe(1)
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })
  })

  describe('FetchStats Action', () => {
    it('should fetch stats successfully', async () => {
      const mockResponse = {
        data: { totalDatasets: 5, totalMessages: 100 }
      }
      api.get.mockResolvedValue(mockResponse)

      const result = await store.fetchStats()

      expect(api.get).toHaveBeenCalledWith('/datasets/stats')
      expect(result).toEqual(mockResponse.data)
    })

    it('should return default stats on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      api.get.mockRejectedValue(new Error('Network error'))

      const result = await store.fetchStats()

      expect(result).toEqual({ totalDatasets: 0, totalMessages: 0 })
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch dataset stats:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('CreateBlankDataset Action', () => {
    it('should create blank dataset successfully', async () => {
      const mockResponse = {
        data: {
          dataset: { id: 1, name: 'Blank Dataset', message_count: 0 }
        }
      }
      api.post.mockResolvedValue(mockResponse)
      
      // Mock fetchDatasets to avoid actual API call
      const fetchDatasetsSpy = vi.spyOn(store, 'fetchDatasets').mockResolvedValue()

      const result = await store.createBlankDataset('Blank Dataset')

      expect(api.post).toHaveBeenCalledWith('/datasets/blank', { name: 'Blank Dataset' })
      expect(fetchDatasetsSpy).toHaveBeenCalled()
      expect(result).toEqual(mockResponse.data.dataset)
      expect(store.error).toBeNull()
      expect(store.isUploading).toBe(false)
    })
  })

  describe('UploadMessagesToDataset Action', () => {
    it('should upload messages to dataset successfully', async () => {
      const mockFile = new File(['content'], 'messages.jsonl', { type: 'application/json' })
      store.currentDataset = { id: 1, message_count: 10 }
      store.datasets = [{ id: 1, message_count: 10 }]

      const mockResponse = {
        data: {
          result: { addedMessages: 5 }
        }
      }
      api.post.mockResolvedValue(mockResponse)

      const result = await store.uploadMessagesToDataset(1, mockFile)

      expect(api.post).toHaveBeenCalledWith('/datasets/1/upload', expect.any(FormData), {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      expect(store.currentDataset.message_count).toBe(15)
      expect(store.datasets[0].message_count).toBe(15)
      expect(result).toEqual(mockResponse.data.result)
      expect(store.error).toBeNull()
    })
  })

  describe('Utility Actions', () => {
    it('should clear error', () => {
      store.error = 'Some error'
      store.clearError()
      expect(store.error).toBeNull()
    })

    it('should clear current dataset', () => {
      store.currentDataset = { id: 1, name: 'Dataset' }
      store.currentMessages = [{ id: 1, messageContent: 'Message' }]
      store.messagesPagination = { page: 2, total: 10 }

      store.clearCurrentDataset()

      expect(store.currentDataset).toBeNull()
      expect(store.currentMessages).toEqual([])
      expect(store.messagesPagination).toEqual({
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 0
      })
    })
  })

  describe('Loading States', () => {
    it('should manage loading state during fetch', async () => {
      let resolveFetch
      api.get.mockImplementation(() => new Promise(resolve => {
        resolveFetch = resolve
      }))

      const fetchPromise = store.fetchDatasets()
      
      expect(store.isLoading).toBe(true)
      
      resolveFetch({ data: { datasets: [], pagination: {} } })
      await fetchPromise
      
      expect(store.isLoading).toBe(false)
    })

    it('should manage uploading state during create', async () => {
      let resolveCreate, resolveFetch
      
      api.post.mockImplementation(() => new Promise(resolve => {
        resolveCreate = resolve
      }))
      
      // Mock fetchDatasets as well since createDataset calls it
      const fetchDatasetsSpy = vi.spyOn(store, 'fetchDatasets').mockImplementation(() => new Promise(resolve => {
        resolveFetch = resolve
      }))

      const mockFile = new File(['content'], 'test.jsonl', { type: 'application/json' })
      const createPromise = store.createDataset('Test', mockFile)
      
      expect(store.isUploading).toBe(true)
      
      // Resolve create first, then fetch
      resolveCreate({ data: { dataset: {} } })
      
      setTimeout(() => {
        resolveFetch()
      }, 0)
      
      await createPromise
      
      expect(store.isUploading).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should clear error when starting new operations', async () => {
      store.error = 'Previous error'
      api.get.mockImplementation(() => new Promise(() => {}))

      store.fetchDatasets()

      expect(store.error).toBeNull()
    })
  })
})