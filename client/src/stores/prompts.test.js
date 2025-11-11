import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePromptsStore } from './prompts'
import api from '@/services/api'

// Mock the API service
vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}))

describe('Prompts Store', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = usePromptsStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.prompts).toEqual([])
      expect(store.currentPrompt).toBeNull()
      expect(store.currentVersions).toEqual([])
      expect(store.pagination).toEqual({
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 0
      })
      expect(store.isLoading).toBe(false)
      expect(store.isSaving).toBe(false)
      expect(store.error).toBeNull()
    })
  })

  describe('Getters', () => {
    it('should return correct prompts count', () => {
      store.prompts = [
        { id: 1, name: 'Prompt 1' },
        { id: 2, name: 'Prompt 2' },
        { id: 3, name: 'Prompt 3' }
      ]
      expect(store.getPromptsCount).toBe(3)
    })

    it('should return correct total prompts from pagination', () => {
      store.pagination = { total: 25 }
      expect(store.getTotalPrompts).toBe(25)
    })

    it('should return correct hasPrompts status', () => {
      expect(store.hasPrompts).toBe(false)

      store.prompts = [{ id: 1, name: 'Prompt 1' }]
      expect(store.hasPrompts).toBe(true)
    })

    it('should return correct prompt by ID', () => {
      const prompt1 = { id: 1, name: 'Prompt 1' }
      const prompt2 = { id: 2, name: 'Prompt 2' }
      store.prompts = [prompt1, prompt2]

      expect(store.getPromptById(1)).toEqual(prompt1)
      expect(store.getPromptById(2)).toEqual(prompt2)
      expect(store.getPromptById(999)).toBeUndefined()
    })
  })

  describe('FetchPrompts Action', () => {
    it('should fetch prompts successfully with default params', async () => {
      const mockResponse = {
        data: {
          prompts: [
            { id: 1, name: 'Prompt 1', template: 'Template 1' },
            { id: 2, name: 'Prompt 2', template: 'Template 2' }
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

      await store.fetchPrompts()

      expect(api.get).toHaveBeenCalledWith('/prompts', {
        params: {
          page: 1,
          pageSize: 50,
          sortBy: 'created_at',
          sortDirection: 'desc'
        }
      })
      expect(store.prompts).toEqual(mockResponse.data.prompts)
      expect(store.pagination).toEqual(mockResponse.data.pagination)
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('should fetch prompts with custom params', async () => {
      const customParams = {
        page: 2,
        pageSize: 25,
        sortBy: 'name',
        sortDirection: 'asc'
      }
      const mockResponse = {
        data: {
          prompts: [],
          pagination: { page: 2, pageSize: 25, total: 0, totalPages: 0 }
        }
      }
      api.get.mockResolvedValue(mockResponse)

      await store.fetchPrompts(customParams)

      expect(api.get).toHaveBeenCalledWith('/prompts', {
        params: customParams
      })
    })

    it('should handle fetch prompts error', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Failed to fetch prompts'
            }
          }
        }
      }
      api.get.mockRejectedValue(mockError)

      await expect(store.fetchPrompts()).rejects.toThrow()

      expect(store.error).toBe('Failed to fetch prompts')
      expect(store.isLoading).toBe(false)
    })

    it('should handle fetch prompts error without specific message', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(store.fetchPrompts()).rejects.toThrow()

      expect(store.error).toBe('Failed to fetch prompts')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('CreatePrompt Action', () => {
    it('should create prompt successfully', async () => {
      const promptData = {
        name: 'New Prompt',
        template: 'This is a test prompt: {{messageContent}}',
        openingTag: '<result>',
        closingTag: '</result>'
      }
      const mockResponse = {
        data: {
          prompt: { id: 1, ...promptData }
        }
      }
      api.post.mockResolvedValue(mockResponse)

      const result = await store.createPrompt(promptData)

      expect(api.post).toHaveBeenCalledWith('/prompts', promptData)
      expect(result).toEqual(mockResponse.data.prompt)
      expect(store.error).toBeNull()
      expect(store.isSaving).toBe(false)
    })

    it('should handle create prompt error', async () => {
      const promptData = { name: 'New Prompt' }
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Template is required'
            }
          }
        }
      }
      api.post.mockRejectedValue(mockError)

      await expect(store.createPrompt(promptData)).rejects.toThrow()

      expect(store.error).toBe('Template is required')
      expect(store.isSaving).toBe(false)
    })
  })

  describe('FetchPromptById Action', () => {
    it('should fetch prompt by ID successfully', async () => {
      const mockResponse = {
        data: { id: 1, name: 'Prompt 1', template: 'Template 1' }
      }
      api.get.mockResolvedValue(mockResponse)

      const result = await store.fetchPromptById(1)

      expect(api.get).toHaveBeenCalledWith('/prompts/1')
      expect(store.currentPrompt).toEqual(mockResponse.data)
      expect(result).toEqual(mockResponse.data)
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('should handle fetch prompt by ID error', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Prompt not found'
            }
          }
        }
      }
      api.get.mockRejectedValue(mockError)

      await expect(store.fetchPromptById(999)).rejects.toThrow()

      expect(store.error).toBe('Prompt not found')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('UpdatePrompt Action', () => {
    it('should update prompt successfully', async () => {
      store.prompts = [
        { id: 1, name: 'Old Name', template: 'Old Template' },
        { id: 2, name: 'Prompt 2', template: 'Template 2' }
      ]
      store.currentPrompt = { id: 1, name: 'Old Name', template: 'Old Template' }

      const updatedData = {
        name: 'Updated Name',
        template: 'Updated Template'
      }
      const mockResponse = {
        data: {
          prompt: { id: 1, ...updatedData }
        }
      }
      api.put.mockResolvedValue(mockResponse)

      const result = await store.updatePrompt(1, updatedData)

      expect(api.put).toHaveBeenCalledWith('/prompts/1', updatedData)
      expect(store.prompts[0]).toEqual(mockResponse.data.prompt)
      expect(store.currentPrompt).toEqual(mockResponse.data.prompt)
      expect(result).toEqual(mockResponse.data.prompt)
      expect(store.error).toBeNull()
      expect(store.isSaving).toBe(false)
    })

    it('should not update current prompt if different ID updated', async () => {
      store.prompts = [
        { id: 1, name: 'Prompt 1', template: 'Template 1' },
        { id: 2, name: 'Old Name', template: 'Old Template' }
      ]
      store.currentPrompt = { id: 1, name: 'Prompt 1', template: 'Template 1' }

      const updatedData = {
        name: 'Updated Name',
        template: 'Updated Template'
      }
      const mockResponse = {
        data: {
          prompt: { id: 2, ...updatedData }
        }
      }
      api.put.mockResolvedValue(mockResponse)

      await store.updatePrompt(2, updatedData)

      expect(store.prompts[1]).toEqual(mockResponse.data.prompt)
      expect(store.currentPrompt).toEqual({ id: 1, name: 'Prompt 1', template: 'Template 1' })
    })

    it('should handle update prompt error', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Validation failed'
            }
          }
        }
      }
      api.put.mockRejectedValue(mockError)

      await expect(store.updatePrompt(1, {})).rejects.toThrow()

      expect(store.error).toBe('Validation failed')
      expect(store.isSaving).toBe(false)
    })
  })

  describe('DeletePrompt Action', () => {
    it('should delete prompt successfully', async () => {
      store.prompts = [
        { id: 1, name: 'Prompt 1' },
        { id: 2, name: 'Prompt 2' }
      ]
      store.currentPrompt = { id: 1, name: 'Prompt 1' }
      store.currentVersions = [{ id: 1, version: 1 }]

      api.delete.mockResolvedValue({})

      await store.deletePrompt(1)

      expect(api.delete).toHaveBeenCalledWith('/prompts/1')
      expect(store.prompts).toEqual([{ id: 2, name: 'Prompt 2' }])
      expect(store.currentPrompt).toBeNull()
      expect(store.currentVersions).toEqual([])
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('should not clear current prompt if different ID deleted', async () => {
      store.prompts = [
        { id: 1, name: 'Prompt 1' },
        { id: 2, name: 'Prompt 2' }
      ]
      store.currentPrompt = { id: 2, name: 'Prompt 2' }

      api.delete.mockResolvedValue({})

      await store.deletePrompt(1)

      expect(store.prompts).toEqual([{ id: 2, name: 'Prompt 2' }])
      expect(store.currentPrompt).toEqual({ id: 2, name: 'Prompt 2' })
    })

    it('should handle delete prompt error', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Cannot delete prompt referenced by evaluations'
            }
          }
        }
      }
      api.delete.mockRejectedValue(mockError)

      await expect(store.deletePrompt(1)).rejects.toThrow()

      expect(store.error).toBe('Cannot delete prompt referenced by evaluations')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('UpdatePromptName Action', () => {
    it('should update prompt name successfully', async () => {
      store.prompts = [
        { id: 1, name: 'Old Name' },
        { id: 2, name: 'Prompt 2' }
      ]
      store.currentPrompt = { id: 1, name: 'Old Name' }

      const mockResponse = {
        data: {
          prompt: { id: 1, name: 'New Name' }
        }
      }
      api.patch.mockResolvedValue(mockResponse)

      const result = await store.updatePromptName(1, 'New Name')

      expect(api.patch).toHaveBeenCalledWith('/prompts/1/name', { name: 'New Name' })
      expect(store.prompts[0].name).toBe('New Name')
      expect(store.currentPrompt.name).toBe('New Name')
      expect(result).toEqual(mockResponse.data.prompt)
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('should not update current prompt name if different ID updated', async () => {
      store.prompts = [
        { id: 1, name: 'Prompt 1' },
        { id: 2, name: 'Old Name' }
      ]
      store.currentPrompt = { id: 1, name: 'Prompt 1' }

      const mockResponse = {
        data: {
          prompt: { id: 2, name: 'New Name' }
        }
      }
      api.patch.mockResolvedValue(mockResponse)

      await store.updatePromptName(2, 'New Name')

      expect(store.prompts[1].name).toBe('New Name')
      expect(store.currentPrompt.name).toBe('Prompt 1')
    })
  })

  describe('FetchPromptVersions Action', () => {
    it('should fetch prompt versions successfully', async () => {
      const mockResponse = {
        data: {
          versions: [
            { id: 1, version: 1, name: 'Version 1' },
            { id: 2, version: 2, name: 'Version 2' }
          ]
        }
      }
      api.get.mockResolvedValue(mockResponse)

      const result = await store.fetchPromptVersions(1)

      expect(api.get).toHaveBeenCalledWith('/prompts/1/versions')
      expect(store.currentVersions).toEqual(mockResponse.data.versions)
      expect(result).toEqual(mockResponse.data.versions)
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('should handle fetch prompt versions error', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              message: 'Prompt not found'
            }
          }
        }
      }
      api.get.mockRejectedValue(mockError)

      await expect(store.fetchPromptVersions(999)).rejects.toThrow()

      expect(store.error).toBe('Prompt not found')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('CheckPromptEditable Action', () => {
    it('should check prompt editability successfully', async () => {
      const mockResponse = {
        data: { canEdit: true, isReferencedInEvaluations: false }
      }
      api.get.mockResolvedValue(mockResponse)

      const result = await store.checkPromptEditable(1)

      expect(api.get).toHaveBeenCalledWith('/prompts/1/editable')
      expect(result).toEqual(mockResponse.data)
    })

    it('should return default values on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      api.get.mockRejectedValue(new Error('Network error'))

      const result = await store.checkPromptEditable(1)

      expect(result).toEqual({ canEdit: false, isReferencedInEvaluations: true })
      expect(consoleSpy).toHaveBeenCalledWith('Failed to check prompt editability:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('FetchStats Action', () => {
    it('should fetch stats successfully', async () => {
      const mockResponse = {
        data: { totalPrompts: 10, totalCreators: 3, totalVersions: 15 }
      }
      api.get.mockResolvedValue(mockResponse)

      const result = await store.fetchStats()

      expect(api.get).toHaveBeenCalledWith('/prompts/stats')
      expect(result).toEqual(mockResponse.data)
    })

    it('should return default stats on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      api.get.mockRejectedValue(new Error('Network error'))

      const result = await store.fetchStats()

      expect(result).toEqual({ totalPrompts: 0, totalCreators: 0, totalVersions: 0 })
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch prompt stats:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('Utility Actions', () => {
    it('should clear error', () => {
      store.error = 'Some error'
      store.clearError()
      expect(store.error).toBeNull()
    })

    it('should clear current prompt', () => {
      store.currentPrompt = { id: 1, name: 'Prompt' }
      store.currentVersions = [{ id: 1, version: 1 }]

      store.clearCurrentPrompt()

      expect(store.currentPrompt).toBeNull()
      expect(store.currentVersions).toEqual([])
    })
  })

  describe('CreatePromptVersion Action', () => {
    it('should create prompt version successfully', async () => {
      const promptData = {
        name: 'Version 2',
        template: 'Updated template'
      }
      const expectedData = {
        ...promptData,
        parentPromptId: 1
      }
      const mockResponse = {
        data: {
          prompt: { id: 2, ...expectedData }
        }
      }
      
      // Mock the createPrompt method
      const createPromptSpy = vi.spyOn(store, 'createPrompt').mockResolvedValue(mockResponse.data.prompt)

      const result = await store.createPromptVersion(1, promptData)

      expect(createPromptSpy).toHaveBeenCalledWith(expectedData)
      expect(result).toEqual(mockResponse.data.prompt)
    })
  })

  describe('Loading States', () => {
    it('should manage loading state during fetch', async () => {
      let resolveFetch
      api.get.mockImplementation(() => new Promise(resolve => {
        resolveFetch = resolve
      }))

      const fetchPromise = store.fetchPrompts()
      
      expect(store.isLoading).toBe(true)
      
      resolveFetch({ data: { prompts: [], pagination: {} } })
      await fetchPromise
      
      expect(store.isLoading).toBe(false)
    })

    it('should manage saving state during create', async () => {
      let resolveCreate
      api.post.mockImplementation(() => new Promise(resolve => {
        resolveCreate = resolve
      }))

      const createPromise = store.createPrompt({ name: 'Test' })
      
      expect(store.isSaving).toBe(true)
      
      resolveCreate({ data: { prompt: {} } })
      await createPromise
      
      expect(store.isSaving).toBe(false)
    })

    it('should manage saving state during update', async () => {
      let resolveUpdate
      api.put.mockImplementation(() => new Promise(resolve => {
        resolveUpdate = resolve
      }))

      const updatePromise = store.updatePrompt(1, { name: 'Updated' })
      
      expect(store.isSaving).toBe(true)
      
      resolveUpdate({ data: { prompt: {} } })
      await updatePromise
      
      expect(store.isSaving).toBe(false)
    })

    it('should manage loading state during delete', async () => {
      let resolveDelete
      api.delete.mockImplementation(() => new Promise(resolve => {
        resolveDelete = resolve
      }))

      const deletePromise = store.deletePrompt(1)
      
      expect(store.isLoading).toBe(true)
      
      resolveDelete({})
      await deletePromise
      
      expect(store.isLoading).toBe(false)
    })

    it('should manage loading state during name update', async () => {
      let resolveUpdate
      api.patch.mockImplementation(() => new Promise(resolve => {
        resolveUpdate = resolve
      }))

      const updatePromise = store.updatePromptName(1, 'New Name')
      
      expect(store.isLoading).toBe(true)
      
      resolveUpdate({ data: { prompt: {} } })
      await updatePromise
      
      expect(store.isLoading).toBe(false)
    })

    it('should manage loading state during versions fetch', async () => {
      let resolveFetch
      api.get.mockImplementation(() => new Promise(resolve => {
        resolveFetch = resolve
      }))

      const fetchPromise = store.fetchPromptVersions(1)
      
      expect(store.isLoading).toBe(true)
      
      resolveFetch({ data: { versions: [] } })
      await fetchPromise
      
      expect(store.isLoading).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should clear error when starting new operations', async () => {
      store.error = 'Previous error'
      api.get.mockImplementation(() => new Promise(() => {}))

      store.fetchPrompts()

      expect(store.error).toBeNull()
    })

    it('should clear error when starting create operation', async () => {
      store.error = 'Previous error'
      api.post.mockImplementation(() => new Promise(() => {}))

      store.createPrompt({ name: 'Test' })

      expect(store.error).toBeNull()
    })

    it('should clear error when starting update operation', async () => {
      store.error = 'Previous error'
      api.put.mockImplementation(() => new Promise(() => {}))

      store.updatePrompt(1, { name: 'Test' })

      expect(store.error).toBeNull()
    })

    it('should clear error when starting delete operation', async () => {
      store.error = 'Previous error'
      api.delete.mockImplementation(() => new Promise(() => {}))

      store.deletePrompt(1)

      expect(store.error).toBeNull()
    })

    it('should clear error when starting name update operation', async () => {
      store.error = 'Previous error'
      api.patch.mockImplementation(() => new Promise(() => {}))

      store.updatePromptName(1, 'New Name')

      expect(store.error).toBeNull()
    })

    it('should clear error when starting versions fetch operation', async () => {
      store.error = 'Previous error'
      api.get.mockImplementation(() => new Promise(() => {}))

      store.fetchPromptVersions(1)

      expect(store.error).toBeNull()
    })
  })
})