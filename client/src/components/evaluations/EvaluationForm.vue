<template>
  <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
      Create New Evaluation
    </h3>
    
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Name -->
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Evaluation Name *
        </label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          required
          class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="e.g., Conversational Detection Test #1"
        >
      </div>
      
      <!-- Description -->
      <div>
        <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <textarea
          id="description"
          v-model="form.description"
          rows="3"
          class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Optional description of what this evaluation is testing..."
        ></textarea>
      </div>
      
      <!-- Dataset Selection -->
      <div>
        <label for="datasetId" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Dataset *
        </label>
        <select
          id="datasetId"
          v-model="form.datasetId"
          required
          class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">Choose a dataset to evaluate against</option>
          <option 
            v-for="dataset in availableDatasets" 
            :key="dataset.id" 
            :value="dataset.id"
          >
            {{ dataset.name }} ({{ dataset.message_count }} messages)
          </option>
        </select>
        <div v-if="selectedDataset" class="mt-2 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
          <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-1">Selected Dataset Info:</h4>
          <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">{{ selectedDataset.message_count }} messages will be evaluated</p>
          <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">Created by <span class="text-sm text-blue-600 dark:text-blue-400 truncate">{{ selectedDataset.created_by_username }}</span></p>
        </div>
      </div>

      <!-- Prompt Selection -->
      <div>
        <label for="promptId" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Prompt *
        </label>
        <select
          id="promptId"
          v-model="form.promptId"
          required
          class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">Choose a prompt to evaluate</option>
          <option 
            v-for="prompt in availablePrompts" 
            :key="prompt.id" 
            :value="prompt.id"
          >
            {{ prompt.name || `Prompt #${prompt.id}` }} - {{ prompt.modelId }}
          </option>
        </select>
        <div v-if="selectedPrompt" class="mt-2 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
          <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-1">Selected Prompt Preview:</h4>
          <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">Model: <span class="text-sm text-blue-600 dark:text-blue-400 truncate">{{ selectedPrompt.modelId }}</span></p>
          <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">Expected Format: {{ selectedPrompt.openingTag }}...{{ selectedPrompt.closingTag }}</p>
          <div class="text-xs text-gray-900 dark:text-gray-100 font-mono bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600 max-h-24 overflow-y-auto">
            {{ selectedPrompt.promptText }}
          </div>
        </div>
      </div>
      
      <!-- Evaluation Cost Estimate -->
      <div v-if="selectedPrompt && selectedDataset" class="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
        <div class="flex items-start">
          <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
          <div class="text-sm">
            <p class="font-medium text-blue-800 dark:text-blue-300 mb-1">Evaluation Summary</p>
            <p class="text-blue-700 dark:text-blue-300">
              This evaluation will process <strong>{{ selectedDataset.message_count }} messages</strong> through the 
              <strong>{{ selectedPrompt.modelId }}</strong> model.
            </p>
            <p class="text-blue-600 dark:text-blue-400 text-xs mt-2">
              ⚠️ This will incur AWS Bedrock API costs. Make sure you have appropriate AWS credentials configured.
            </p>
          </div>
        </div>
      </div>
      
      <!-- Error Message -->
      <div v-if="error" class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-4">
        <div class="text-sm text-red-800 dark:text-red-300">{{ error }}</div>
      </div>
      
      <!-- Form Actions -->
      <div class="flex justify-end space-x-3">
        <button
          type="button"
          @click="$emit('cancel')"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="isSaving || !isFormValid"
          class="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg v-if="isSaving" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isSaving ? 'Creating...' : 'Create Evaluation' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useEvaluationsStore } from '@/stores/evaluations'

export default {
  name: 'EvaluationForm',
  props: {
    availablePrompts: {
      type: Array,
      default: () => []
    },
    availableDatasets: {
      type: Array,
      default: () => []
    }
  },
  emits: ['submit', 'cancel'],
  setup(props, { emit }) {
    const evaluationsStore = useEvaluationsStore()
    
    const form = ref({
      name: '',
      description: '',
      promptId: '',
      datasetId: ''
    })
    
    const isSaving = computed(() => evaluationsStore.isSaving)
    const error = computed(() => evaluationsStore.error)
    
    const isFormValid = computed(() => {
      return form.value.name?.trim() && 
             form.value.promptId && 
             form.value.datasetId
    })
    
    const selectedPrompt = computed(() => {
      if (!form.value.promptId) return null
      return props.availablePrompts.find(p => p.id == form.value.promptId)
    })
    
    const selectedDataset = computed(() => {
      if (!form.value.datasetId) return null
      return props.availableDatasets.find(d => d.id == form.value.datasetId)
    })
    
    const handleSubmit = async () => {
      if (!isFormValid.value) return
      
      try {
        evaluationsStore.clearError()
        
        const evaluationData = {
          name: form.value.name.trim(),
          description: form.value.description?.trim() || null,
          promptId: parseInt(form.value.promptId),
          datasetId: parseInt(form.value.datasetId)
        }
        
        const result = await evaluationsStore.createEvaluation(evaluationData)
        emit('submit', result)
        
        // Reset form
        form.value = {
          name: '',
          description: '',
          promptId: '',
          datasetId: ''
        }
      } catch (error) {
        // Error is handled by the store
      }
    }
    
    return {
      form,
      isSaving,
      error,
      isFormValid,
      selectedPrompt,
      selectedDataset,
      handleSubmit
    }
  }
}
</script>