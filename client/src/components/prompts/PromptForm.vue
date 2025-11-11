<template>
  <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
      {{ isEditing ? 'Edit Prompt' : 'Create New Prompt' }}
    </h3>
    
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Name -->
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Name *
        </label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          required
          class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="e.g., Conversational Analysis Prompt"
        >
      </div>
      
      <!-- Model ID -->
      <div>
        <label for="modelId" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Model *
        </label>
        <select
          id="modelId"
          v-model="form.modelId"
          required
          :disabled="isLoadingModels"
          class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">{{ isLoadingModels ? 'Loading models...' : 'Select a model' }}</option>
          <optgroup v-for="group in availableModels" :key="group.group" :label="group.group">
            <option v-for="model in group.models" :key="model.id" :value="model.id">
              {{ model.name }}
            </option>
          </optgroup>
        </select>
        <p class="mt-1 text-sm text-gray-500">
          Choose from available AWS Bedrock models
        </p>
        <div v-if="modelsError" class="mt-2 text-sm text-amber-600 dark:text-amber-400">
          {{ modelsError }}
        </div>
      </div>
      
      <!-- Prompt Text -->
      <div>
        <label for="promptText" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Prompt Text *
        </label>
        <textarea
          id="promptText"
          v-model="form.promptText"
          rows="16"
          required
          class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
          placeholder="You are an AI assistant that analyzes text content.

Analyze the following text and determine if it is conversational in nature:
```
&#123;&#123;messageContent&#125;&#125;
```

Respond with <isConversational>true</isConversational> if the text is conversational, or <isConversational>false</isConversational> if it is not."
        ></textarea>
        
        <!-- Simple highlighting indicator below textarea -->
        <div v-if="form.promptText && form.promptText.includes('{{messageContent}}')" class="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center">
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          ✓ Template placeholder detected: &#123;&#123;messageContent&#125;&#125;
        </div>
        <div v-else-if="form.promptText && !form.promptText.includes('{{messageContent}}')" class="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center">
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          ⚠ Remember to include &#123;&#123;messageContent&#125;&#125; placeholder
        </div>
        <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <div class="text-sm">
              <p class="font-medium text-blue-800 dark:text-blue-300 mb-1">Dataset Integration Required</p>
              <p class="text-blue-700 dark:text-blue-300 mb-2">
                Use <code class="bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-xs font-mono">&#123;&#123;messageContent&#125;&#125;</code> as a placeholder in your prompt. 
                During evaluation, this will be replaced with each message from your selected dataset.
              </p>
              <div class="text-xs text-blue-600 dark:text-blue-400">
                <strong>Example:</strong> If your dataset contains "Hello, how are you?", the placeholder will be replaced with that text during evaluation.
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Expected Output Tags -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Expected Output Tags *
        </label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="openingTag" class="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
              Opening Tag
            </label>
            <input
              id="openingTag"
              v-model="form.openingTag"
              type="text"
              required
              class="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="e.g., <isConversational>"
            >
          </div>
          <div>
            <label for="closingTag" class="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
              Closing Tag
            </label>
            <input
              id="closingTag"
              v-model="form.closingTag"
              type="text"
              required
              class="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="e.g., </isConversational>"
            >
          </div>
        </div>
        <div class="mt-3 text-sm text-gray-500 dark:text-gray-400">
          <p>Define the opening and closing tags that wrap the expected response format for evaluation.</p>
          <div class="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded text-xs">
            <strong>Example:</strong> Opening: <code class="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">&lt;isConversational&gt;</code>, 
            Closing: <code class="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">&lt;/isConversational&gt;</code>
            <br>Expected response: <code class="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">&lt;isConversational&gt;true&lt;/isConversational&gt;</code>
          </div>
          <p class="mt-2 text-orange-600 dark:text-orange-400 font-medium">⚠️ Important: Your prompt text should instruct the model to respond with "true" or "false" between these tags to match dataset labeling.</p>
        </div>
      </div>
      
      <!-- Advanced Settings -->
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
        <button
          type="button"
          @click="showAdvanced = !showAdvanced"
          class="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          <svg 
            :class="['w-4 h-4 mr-1 transition-transform', showAdvanced ? 'rotate-90' : '']"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          Advanced Settings
        </button>
        
        <div v-if="showAdvanced" class="mt-4 space-y-4">
          <!-- Max Tokens -->
          <div>
            <label for="maxTokens" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Max Tokens
            </label>
            <input
              id="maxTokens"
              v-model.number="form.maxTokens"
              type="number"
              min="1"
              max="200000"
              class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="4096"
            >
          </div>
          
          <!-- Temperature -->
          <div>
            <label for="temperature" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Temperature: {{ form.temperature || 0 }}
            </label>
            <input
              id="temperature"
              v-model.number="form.temperature"
              type="range"
              min="0"
              max="2"
              step="0.1"
              class="mt-2 block w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            >
            <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>0 (Focused)</span>
              <span>1 (Balanced)</span>
              <span>2 (Creative)</span>
            </div>
          </div>
          
          <!-- Top P -->
          <div>
            <label for="topP" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Top P: {{ form.topP || 0 }}
            </label>
            <input
              id="topP"
              v-model.number="form.topP"
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              class="mt-2 block w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            >
            <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>0 (Deterministic)</span>
              <span>0.5 (Moderate)</span>
              <span>1 (Diverse)</span>
            </div>
          </div>
          
          <!-- Stop Sequences -->
          <div>
            <label for="stopSequences" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Stop Sequences
            </label>
            <div class="mt-1 space-y-2">
              <div v-for="(sequence, index) in form.stopSequences" :key="index" class="flex">
                <input
                  v-model="form.stopSequences[index]"
                  type="text"
                  class="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Enter stop sequence"
                >
                <button
                  type="button"
                  @click="removeStopSequence(index)"
                  class="ml-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  Remove
                </button>
              </div>
              <button
                type="button"
                @click="addStopSequence"
                class="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                + Add Stop Sequence
              </button>
            </div>
          </div>
          
          <!-- Parent Prompt (for versioning) -->
          <div v-if="!isEditing && form.parentPromptId">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Creating Version Of
            </label>
            <div class="mt-1 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-blue-900 dark:text-blue-200">{{ parentPromptName }}</p>
                  <p class="text-xs text-blue-700 dark:text-blue-300">This prompt will be created as a new version</p>
                </div>
                <button
                  type="button"
                  @click="clearParentPrompt"
                  class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
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
          {{ isSaving ? 'Saving...' : (isEditing ? 'Update Prompt' : 'Create Prompt') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { usePromptsStore } from '@/stores/prompts'
import modelsService from '@/services/models'

const DEFAULT_TEMPERATURE = 0.3
const DEFAULT_TOP_P = 0.2

export default {
  name: 'PromptForm',
  props: {
    prompt: {
      type: Object,
      default: null
    },
    availablePrompts: {
      type: Array,
      default: () => []
    }
  },
  emits: ['submit', 'cancel'],
  setup(props, { emit }) {
    const promptsStore = usePromptsStore()
    const showAdvanced = ref(false)
    
    // Models state
    const availableModels = ref([])
    const isLoadingModels = ref(false)
    const modelsError = ref(null)
    
    const form = ref({
      name: '',
      modelId: '',
      promptText: '',
      maxTokens: null,
      temperature: DEFAULT_TEMPERATURE,
      topP: DEFAULT_TOP_P,
      stopSequences: [],
      openingTag: '',
      closingTag: '',
      parentPromptId: null
    })
    
    const isEditing = computed(() => !!props.prompt?.id)
    const isSaving = computed(() => promptsStore.isSaving)
    const error = computed(() => promptsStore.error)
    
    const isFormValid = computed(() => {
      return form.value.name?.trim() &&
             form.value.modelId?.trim() && 
             form.value.promptText?.trim() && 
             form.value.openingTag?.trim() &&
             form.value.closingTag?.trim()
    })
    
    const parentPromptName = computed(() => {
      if (!form.value.parentPromptId) return ''
      const parentPrompt = props.availablePrompts.find(p => p.id === form.value.parentPromptId)
      return parentPrompt ? (parentPrompt.name || `Prompt #${parentPrompt.id}`) : ''
    })
    
    // Initialize form with existing prompt data
    watch(() => props.prompt, (newPrompt) => {
      if (newPrompt) {
        form.value = {
          name: newPrompt.name || `Prompt #${newPrompt.id}`,
          modelId: newPrompt.modelId || '',
          promptText: newPrompt.promptText || '',
          maxTokens: newPrompt.maxTokens,
          temperature: newPrompt.temperature !== null ? newPrompt.temperature : DEFAULT_TEMPERATURE,
          topP: newPrompt.topP !== null ? newPrompt.topP : DEFAULT_TOP_P,
          stopSequences: newPrompt.stopSequences ? [...newPrompt.stopSequences] : [],
          openingTag: newPrompt.openingTag || '',
          closingTag: newPrompt.closingTag || '',
          parentPromptId: newPrompt.parentPromptId || newPrompt.parent_prompt_id || null
        }
        showAdvanced.value = !!(newPrompt.maxTokens || newPrompt.temperature !== null || newPrompt.topP !== null || newPrompt.stopSequences?.length)
      }
    }, { immediate: true })
    
    const addStopSequence = () => {
      form.value.stopSequences.push('')
    }
    
    const removeStopSequence = (index) => {
      form.value.stopSequences.splice(index, 1)
    }
    
    const clearParentPrompt = () => {
      form.value.parentPromptId = null
    }
    
    const loadAvailableModels = async () => {
      isLoadingModels.value = true
      modelsError.value = null
      
      const result = await modelsService.getAvailableModels()
      availableModels.value = result.models
      modelsError.value = result.error
      
      isLoadingModels.value = false
    }
    
    const handleSubmit = async () => {
      if (!isFormValid.value) return
      
      try {
        promptsStore.clearError()
        
        const promptData = {
          name: form.value.name?.trim() || '',
          modelId: form.value.modelId?.trim() || '',
          promptText: form.value.promptText?.trim() || '',
          openingTag: form.value.openingTag?.trim() || '',
          closingTag: form.value.closingTag?.trim() || '',
          maxTokens: form.value.maxTokens || null,
          temperature: form.value.temperature !== null ? form.value.temperature : DEFAULT_TEMPERATURE,
          topP: form.value.topP !== null ? form.value.topP : DEFAULT_TOP_P,
          stopSequences: form.value.stopSequences.filter(seq => seq.trim()),
          parentPromptId: form.value.parentPromptId || null
        }
        
        let result
        if (isEditing.value) {
          result = await promptsStore.updatePrompt(props.prompt.id, promptData)
        } else {
          result = await promptsStore.createPrompt(promptData)
        }
        emit('submit', result)
        
        // Reset form if creating new prompt
        if (!isEditing.value) {
          form.value = {
            name: '',
            modelId: '',
            promptText: '',
            maxTokens: null,
            temperature: DEFAULT_TEMPERATURE,
            topP: DEFAULT_TOP_P,
            stopSequences: [],
            openingTag: '',
            closingTag: '',
            parentPromptId: null
          }
          showAdvanced.value = false
        }
      } catch (error) {
        // Error is handled by the store
      }
    }
    
    // Load models on component mount
    onMounted(() => {
      loadAvailableModels()
    })
    
    return {
      form,
      showAdvanced,
      isEditing,
      isSaving,
      error,
      isFormValid,
      parentPromptName,
      availableModels,
      isLoadingModels,
      modelsError,
      addStopSequence,
      removeStopSequence,
      clearParentPrompt,
      loadAvailableModels,
      handleSubmit
    }
  }
}
</script>

<style scoped>
/* Custom slider styling */
.slider::-webkit-slider-thumb {
  appearance: none;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #4f46e5;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.slider::-moz-range-thumb {
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #4f46e5;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.slider::-webkit-slider-track {
  background: #e5e7eb;
  border-radius: 5px;
}

.slider::-moz-range-track {
  background: #e5e7eb;
  border-radius: 5px;
}

.slider:focus {
  outline: none;
}

.slider:focus::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}
</style>