import { defineStore } from 'pinia'
import api from '@/services/api'

export const usePromptsStore = defineStore('prompts', {
  state: () => ({
    prompts: [],
    currentPrompt: null,
    currentVersions: [],
    pagination: {
      page: 1,
      pageSize: 50,
      total: 0,
      totalPages: 0
    },
    isLoading: false,
    isSaving: false,
    error: null
  }),
  
  getters: {
    getPromptsCount: (state) => state.prompts.length,
    getTotalPrompts: (state) => state.pagination.total,
    hasPrompts: (state) => state.prompts.length > 0,
    getPromptById: (state) => (id) => {
      return state.prompts.find(prompt => prompt.id === id)
    }
  },
  
  actions: {
    async fetchPrompts(params = {}) {
      this.isLoading = true
      this.error = null
      
      // Set defaults
      const queryParams = {
        page: 1,
        pageSize: 50,
        sortBy: 'created_at',
        sortDirection: 'desc',
        ...params
      }
      
      try {
        const response = await api.get('/prompts', {
          params: queryParams
        })
        this.prompts = response.data.prompts
        this.pagination = response.data.pagination
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Failed to fetch prompts'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async createPrompt(promptData) {
      this.isSaving = true
      this.error = null
      
      try {
        const response = await api.post('/prompts', promptData)
        
        // Don't auto-refresh here - let the view handle it to ensure proper page navigation
        return response.data.prompt
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Failed to create prompt'
        throw error
      } finally {
        this.isSaving = false
      }
    },
    
    async fetchPromptById(id) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await api.get(`/prompts/${id}`)
        this.currentPrompt = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Failed to fetch prompt'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async updatePrompt(id, promptData) {
      this.isSaving = true
      this.error = null
      
      try {
        const response = await api.put(`/prompts/${id}`, promptData)
        
        // Update the prompt in the local state
        const index = this.prompts.findIndex(prompt => prompt.id === id)
        if (index !== -1) {
          this.prompts[index] = response.data.prompt
        }
        
        // Update current prompt if it's the same
        if (this.currentPrompt?.id === id) {
          this.currentPrompt = response.data.prompt
        }
        
        return response.data.prompt
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Failed to update prompt'
        throw error
      } finally {
        this.isSaving = false
      }
    },
    
    async deletePrompt(id) {
      this.isLoading = true
      this.error = null
      
      try {
        await api.delete(`/prompts/${id}`)
        
        // Remove from local state
        this.prompts = this.prompts.filter(prompt => prompt.id !== id)
        
        // Clear current prompt if it's the deleted one
        if (this.currentPrompt?.id === id) {
          this.currentPrompt = null
          this.currentVersions = []
        }
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Failed to delete prompt'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async updatePromptName(id, name) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await api.patch(`/prompts/${id}/name`, { name })
        
        // Update local state
        const index = this.prompts.findIndex(prompt => prompt.id === id)
        if (index !== -1) {
          this.prompts[index].name = name
        }
        
        // Update current prompt if it's the one being edited
        if (this.currentPrompt?.id === id) {
          this.currentPrompt.name = name
        }
        
        return response.data.prompt
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Failed to update prompt name'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async fetchPromptVersions(id) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await api.get(`/prompts/${id}/versions`)
        this.currentVersions = response.data.versions
        return response.data.versions
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Failed to fetch prompt versions'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async checkPromptEditable(id) {
      try {
        const response = await api.get(`/prompts/${id}/editable`)
        return response.data
      } catch (error) {
        console.error('Failed to check prompt editability:', error)
        return { canEdit: false, isReferencedInEvaluations: true }
      }
    },
    
    async fetchStats() {
      try {
        const response = await api.get('/prompts/stats')
        return response.data
      } catch (error) {
        console.error('Failed to fetch prompt stats:', error)
        return { totalPrompts: 0, totalCreators: 0, totalVersions: 0 }
      }
    },
    
    clearError() {
      this.error = null
    },
    
    clearCurrentPrompt() {
      this.currentPrompt = null
      this.currentVersions = []
    },
    
    // Helper method to create a new version of an existing prompt
    async createPromptVersion(parentId, promptData) {
      const versionData = {
        ...promptData,
        parentPromptId: parentId
      }
      
      return await this.createPrompt(versionData)
    }
  }
})