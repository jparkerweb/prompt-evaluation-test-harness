<template>
  <div 
    class="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50"
    @click="handleBackdropClick"
  >
    <div 
      class="relative w-full max-w-4xl mx-4 h-[90vh] flex flex-col bg-white dark:bg-gray-800 rounded-md shadow-lg"
      @click.stop
    >
      <!-- Fixed Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            {{ prompt?.name || `Prompt #${prompt?.id}` }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            ID: {{ prompt?.id }} • 
            Created by <span class="text-sm text-blue-600 dark:text-blue-400 truncate">{{ prompt?.created_by_username }}</span> • 
            {{ formatDate(prompt?.created_at) }}
          </p>
        </div>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Scrollable Content Area -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        <!-- Loading State -->
        <div v-if="isLoading" class="p-8 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading prompt details...</p>
        </div>
        
        <!-- Prompt Content -->
        <div v-else-if="prompt" class="space-y-6">
        <!-- Basic Information -->
        <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Basic Information</h4>
          <dl class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <div>
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Model ID</dt>
              <dd class="mt-1 text-sm text-blue-600 dark:text-blue-400 font-mono">{{ prompt.modelId }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Expected Output Format</dt>
              <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                <code class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs mr-1">{{ prompt.openingTag }}</code>...
                <code class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs ml-1">{{ prompt.closingTag }}</code>
              </dd>
            </div>
            <div v-if="prompt.parent_prompt_text">
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Parent Prompt</dt>
              <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ prompt.parent_prompt_text }}</dd>
            </div>
          </dl>
        </div>
        
        <!-- Model Parameters -->
        <div v-if="hasModelParameters">
          <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Model Parameters</h4>
          <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <dl class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
              <div v-if="prompt.maxTokens">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Max Tokens</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ prompt.maxTokens }}</dd>
              </div>
              <div v-if="prompt.temperature !== null && prompt.temperature !== undefined">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Temperature</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ prompt.temperature }}</dd>
              </div>
              <div v-if="prompt.topP !== null && prompt.topP !== undefined">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Top P</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ prompt.topP }}</dd>
              </div>
            </dl>
            
            <div v-if="prompt.stopSequences && prompt.stopSequences.length > 0" class="mt-3">
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Stop Sequences</dt>
              <dd class="mt-1">
                <div class="flex flex-wrap gap-2">
                  <span 
                    v-for="sequence in prompt.stopSequences" 
                    :key="sequence"
                    class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-mono"
                  >
                    {{ sequence }}
                  </span>
                </div>
              </dd>
            </div>
          </div>
        </div>

        <!-- Prompt Text -->
        <div>
          <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Prompt Text</h4>
          <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-300 dark:border-gray-600">
            <pre class="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100 font-mono">{{ prompt.promptText }}</pre>
          </div>
        </div>
        
        <!-- Versions -->
        <div v-if="versions && versions.length > 0">
          <div class="flex justify-between items-center mb-3">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white">Versions ({{ versions.length }})</h4>
          </div>
          
          <div class="space-y-3">
            <div 
              v-for="version in versions" 
              :key="version.id"
              class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="flex items-center space-x-2">
                    <span class="text-sm font-medium text-gray-900 dark:text-white">Version {{ version.id }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(version.created_at) }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">by {{ version.created_by_username }}</span>
                  </div>
                  <p class="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {{ version.promptText }}
                  </p>
                  <div class="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                    <span>Model: <span class="text-sm text-blue-600 dark:text-blue-400 truncate">{{ version.modelId }}</span></span>
                    <span v-if="version.maxTokens">Tokens: {{ version.maxTokens }}</span>
                    <span v-if="version.temperature">Temp: {{ version.temperature }}</span>
                  </div>
                </div>
                <div class="ml-4 flex space-x-2">
                  <button
                    @click="$emit('view-version', version)"
                    class="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
      
      <!-- Fixed Footer Actions -->
      <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div class="flex justify-end space-x-3">
          <button
            @click="$emit('close')"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Close
          </button>
          <button
            @click="$emit('edit', prompt)"
            :disabled="!canEdit"
            :title="canEdit ? 'Edit prompt' : 'Cannot edit prompt that is referenced in existing evaluations'"
            :class="[
              'px-4 py-2 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2',
              canEdit 
                ? 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-indigo-500' 
                : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
            ]"
          >
            Edit
          </button>
          <button
            @click="$emit('version', prompt)"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create Copy
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, watch, onMounted, ref } from 'vue'
import { usePromptsStore } from '@/stores/prompts'
import { formatDate } from '@/utils/dateFormat'

export default {
  name: 'PromptDetail',
  props: {
    promptId: {
      type: Number,
      required: true
    }
  },
  emits: ['close', 'edit', 'version', 'view-version', 'edit-version'],
  setup(props, { emit }) {
    const promptsStore = usePromptsStore()
    const canEdit = ref(true)
    
    const prompt = computed(() => promptsStore.currentPrompt)
    const versions = computed(() => promptsStore.currentVersions)
    const isLoading = computed(() => promptsStore.isLoading)
    
    const hasModelParameters = computed(() => {
      if (!prompt.value) return false
      return prompt.value.maxTokens || 
             prompt.value.temperature !== null || 
             prompt.value.topP !== null || 
             (prompt.value.stopSequences && prompt.value.stopSequences.length > 0)
    })
    
    
    const refreshVersions = async () => {
      if (props.promptId) {
        try {
          await promptsStore.fetchPromptVersions(props.promptId)
        } catch (error) {
          console.error('Failed to refresh versions:', error)
        }
      }
    }
    
    const loadPromptData = async () => {
      if (props.promptId) {
        try {
          await promptsStore.fetchPromptById(props.promptId)
          await promptsStore.fetchPromptVersions(props.promptId)
          
          // Check if prompt can be edited
          const editableInfo = await promptsStore.checkPromptEditable(props.promptId)
          canEdit.value = editableInfo.canEdit
        } catch (error) {
          console.error('Failed to load prompt data:', error)
        }
      }
    }
    
    // Load data when component mounts or promptId changes
    watch(() => props.promptId, loadPromptData, { immediate: true })
    
    const handleBackdropClick = () => {
      emit('close')
    }
    
    return {
      prompt,
      versions,
      isLoading,
      hasModelParameters,
      canEdit,
      formatDate,
      refreshVersions,
      handleBackdropClick
    }
  }
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>