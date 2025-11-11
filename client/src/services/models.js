import api from './api'

/**
 * Service for fetching available models from the backend
 */
class ModelsService {
  /**
   * Fetch available models from the API
   * @returns {Promise<{models: Array, error: string|null}>} Object with models array and error status
   */
  async getAvailableModels() {
    try {
      const response = await api.get('/config/models')
      return {
        models: response.data.data || [],
        error: null
      }
    } catch (error) {
      console.error('Failed to fetch models from API:', error)
      
      // Return fallback models with error indicator
      return {
        models: this.getFallbackModels(),
        error: 'Failed to load models from server. Using fallback list.'
      }
    }
  }

  /**
   * Fallback models in case API fails
   * @returns {Array} Array of model groups
   */
  getFallbackModels() {
    return [
      {
        group: 'Claude 4',
        models: [
          { id: 'us.anthropic.claude-opus-4-20250514-v1:0', name: 'Claude 4 Opus' },
          { id: 'us.anthropic.claude-sonnet-4-20250514-v1:0', name: 'Claude 4 Sonnet' }
        ]
      },
      {
        group: 'Claude 3.7',
        models: [
          { id: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0', name: 'Claude 3.7 Sonnet' }
        ]
      },
      {
        group: 'Claude 3.5',
        models: [
          { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'Claude 3.5 Sonnet v2' },
          { id: 'anthropic.claude-3-5-sonnet-20240620-v1:0', name: 'Claude 3.5 Sonnet' },
          { id: 'anthropic.claude-3-5-haiku-20241022-v1:0', name: 'Claude 3.5 Haiku' }
        ]
      },
      {
        group: 'Claude 3',
        models: [
          { id: 'anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku' }
        ]
      },
      {
        group: 'Nova',
        models: [
          { id: 'us.amazon.nova-pro-v1:0', name: 'Nova Pro' },
          { id: 'us.amazon.nova-lite-v1:0', name: 'Nova Lite' },
          { id: 'us.amazon.nova-micro-v1:0', name: 'Nova Micro' }
        ]
      },
      {
        group: 'Llama 3.3',
        models: [
          { id: 'us.meta.llama3-3-70b-instruct-v1:0', name: 'Llama 3.3 70B' }
        ]
      },
      {
        group: 'Llama 3.2',
        models: [
          { id: 'us.meta.llama3-2-1b-instruct-v1:0', name: 'Llama 3.2 1B' },
          { id: 'us.meta.llama3-2-3b-instruct-v1:0', name: 'Llama 3.2 3B' },
          { id: 'us.meta.llama3-2-11b-instruct-v1:0', name: 'Llama 3.2 11B' },
          { id: 'us.meta.llama3-2-90b-instruct-v1:0', name: 'Llama 3.2 90B' }
        ]
      },
      {
        group: 'Llama 3.1',
        models: [
          { id: 'meta.llama3-1-8b-instruct-v1:0', name: 'Llama 3.1 8B' },
          { id: 'meta.llama3-1-70b-instruct-v1:0', name: 'Llama 3.1 70B' },
          { id: 'meta.llama3-1-405b-instruct-v1:0', name: 'Llama 3.1 405B' }
        ]
      },
      {
        group: 'Llama 3',
        models: [
          { id: 'meta.llama3-8b-instruct-v1:0', name: 'Llama 3 8B' },
          { id: 'meta.llama3-70b-instruct-v1:0', name: 'Llama 3 70B' }
        ]
      },
      {
        group: 'Mistral',
        models: [
          { id: 'mistral.mistral-7b-instruct-v0:2', name: 'Mistral 7B' },
          { id: 'mistral.mixtral-8x7b-instruct-v0:1', name: 'Mixtral 8x7B' },
          { id: 'mistral.mistral-large-2402-v1:0', name: 'Mistral Large' }
        ]
      }
    ]
  }
}

export default new ModelsService()