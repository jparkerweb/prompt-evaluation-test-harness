import { defineStore } from 'pinia'
import api from '@/services/api'

export const useDatasetsStore = defineStore('datasets', {
  state: () => ({
    datasets: [],
    currentDataset: null,
    currentMessages: [],
    pagination: {
      page: 1,
      pageSize: 50,
      total: 0,
      totalPages: 0
    },
    messagesPagination: {
      page: 1,
      pageSize: 50,
      total: 0,
      totalPages: 0
    },
    isLoading: false,
    isUploading: false,
    error: null
  }),
  
  getters: {
    getDatasetsCount: (state) => state.datasets.length,
    getTotalMessages: (state) => {
      return state.datasets.reduce((total, dataset) => total + (dataset.message_count || 0), 0)
    }
  },
  
  actions: {
    async fetchDatasets(params = {}) {
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
        const response = await api.get('/datasets', {
          params: queryParams
        })
        this.datasets = response.data.datasets
        this.pagination = response.data.pagination
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Failed to fetch datasets'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async createDataset(name, file) {
      this.isUploading = true
      this.error = null
      
      try {
        const formData = new FormData()
        formData.append('name', name)
        formData.append('file', file)
        
        const response = await api.post('/datasets', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        // Refresh the datasets list
        await this.fetchDatasets()
        
        return response.data.dataset
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Failed to create dataset'
        throw error
      } finally {
        this.isUploading = false
      }
    },
    
    async fetchDatasetById(id) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await api.get(`/datasets/${id}`)
        this.currentDataset = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Failed to fetch dataset'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async fetchDatasetMessages(datasetId, page = 1, pageSize = 50) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await api.get(`/datasets/${datasetId}/messages`, {
          params: { page, pageSize }
        })
        
        this.currentMessages = response.data.messages
        this.messagesPagination = response.data.pagination
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Failed to fetch messages'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async deleteDataset(id) {
      this.isLoading = true
      this.error = null
      
      try {
        await api.delete(`/datasets/${id}`)
        
        // Remove from local state
        this.datasets = this.datasets.filter(dataset => dataset.id !== id)
        
        // If this was the current dataset, clear it
        if (this.currentDataset?.id === id) {
          this.currentDataset = null
          this.currentMessages = []
        }
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Failed to delete dataset'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async updateDatasetName(id, name) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await api.patch(`/datasets/${id}/name`, { name })
        
        // Update local state
        const index = this.datasets.findIndex(dataset => dataset.id === id)
        if (index !== -1) {
          this.datasets[index].name = name
        }
        
        // Update current dataset if it's the one being edited
        if (this.currentDataset?.id === id) {
          this.currentDataset.name = name
        }
        
        return response.data.dataset
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Failed to update dataset name'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async fetchStats() {
      try {
        const response = await api.get('/datasets/stats')
        return response.data
      } catch (error) {
        console.error('Failed to fetch dataset stats:', error)
        return { totalDatasets: 0, totalMessages: 0 }
      }
    },
    
    async createDatasetMessage(datasetId, label, messageContent) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await api.post(`/datasets/${datasetId}/messages`, {
          label,
          messageContent
        })
        
        // Update pagination total
        if (this.messagesPagination.total >= 0) {
          this.messagesPagination.total++
        }
        
        // Update the dataset message count if it's loaded
        if (this.currentDataset && this.currentDataset.id === datasetId) {
          this.currentDataset.message_count++
        }
        
        // Update in the datasets list too
        const datasetIndex = this.datasets.findIndex(d => d.id === datasetId)
        if (datasetIndex !== -1) {
          this.datasets[datasetIndex].message_count++
        }
        
        return response.data.data
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Failed to create message'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async updateDatasetMessage(datasetId, messageId, label, messageContent) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await api.patch(`/datasets/${datasetId}/messages/${messageId}`, {
          label,
          messageContent
        })
        
        // Update the message in the current messages array
        const messageIndex = this.currentMessages.findIndex(msg => msg.id === messageId)
        if (messageIndex !== -1) {
          this.currentMessages[messageIndex] = {
            ...this.currentMessages[messageIndex],
            label: response.data.data.label,
            messageContent: response.data.data.messageContent
          }
        }
        
        return response.data.data
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Failed to update message'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async deleteDatasetMessage(datasetId, messageId) {
      this.isLoading = true
      this.error = null
      
      try {
        await api.delete(`/datasets/${datasetId}/messages/${messageId}`)
        
        // Remove the message from current messages
        this.currentMessages = this.currentMessages.filter(msg => msg.id !== messageId)
        
        // Update pagination total
        if (this.messagesPagination.total > 0) {
          this.messagesPagination.total--
        }
        
        // Update the dataset message count if it's loaded
        if (this.currentDataset && this.currentDataset.message_count > 0) {
          this.currentDataset.message_count--
        }
        
        // Update in the datasets list too
        const datasetIndex = this.datasets.findIndex(d => d.id === datasetId)
        if (datasetIndex !== -1 && this.datasets[datasetIndex].message_count > 0) {
          this.datasets[datasetIndex].message_count--
        }
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Failed to delete message'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    clearError() {
      this.error = null
    },
    
    clearCurrentDataset() {
      this.currentDataset = null
      this.currentMessages = []
      this.messagesPagination = {
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 0
      }
    },
    
    async createBlankDataset(name) {
      this.isUploading = true
      this.error = null
      
      try {
        const response = await api.post('/datasets/blank', { name })
        
        // Refresh the datasets list
        await this.fetchDatasets()
        
        return response.data.dataset
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Failed to create blank dataset'
        throw error
      } finally {
        this.isUploading = false
      }
    },
    
    async uploadMessagesToDataset(datasetId, file) {
      this.error = null
      
      try {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await api.post(`/datasets/${datasetId}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        // Update the dataset in the local state without refetching everything
        const result = response.data.result
        
        // Update the current dataset if it's the one being updated
        if (this.currentDataset?.id === datasetId) {
          // Just update the message count locally
          this.currentDataset.message_count = (this.currentDataset.message_count || 0) + result.addedMessages
        }
        
        // Update the dataset in the datasets array
        const datasetIndex = this.datasets.findIndex(d => d.id === datasetId)
        if (datasetIndex !== -1) {
          this.datasets[datasetIndex].message_count = (this.datasets[datasetIndex].message_count || 0) + result.addedMessages
        }
        
        return result
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Failed to upload messages to dataset'
        throw error
      }
    }
  }
})