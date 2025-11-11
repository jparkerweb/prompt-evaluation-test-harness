<template>
  <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Upload or Create New Dataset</h3>
    
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Dataset Name -->
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Dataset Name
        </label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          required
          class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Enter dataset name"
        >
      </div>
      
      <!-- File Upload -->
      <div>
        <label for="file" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          JSONL File <span class="text-gray-500 dark:text-gray-400">(optional for blank dataset)</span>
        </label>
        <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
          <div class="space-y-1 text-center">
            <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <div class="flex text-sm text-gray-600 dark:text-gray-400">
              <label for="file" class="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                <span>Upload a Dataset file</span>
                <input
                  id="file"
                  ref="fileInput"
                  type="file"
                  accept=".jsonl,.json"
                  class="sr-only"
                  @change="handleFileChange"
                >
              </label>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              JSONL files up to {{ maxFileSize }}MB
            </p>
            <div v-if="selectedFile" class="text-sm text-green-600 dark:text-green-400">
              Selected: {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
            </div>
          </div>
        </div>
      </div>
      
      <!-- Format Help -->
      <div class="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md p-4">
        <h4 class="text-sm font-medium text-blue-800 dark:text-blue-300">JSONL Format Requirements:</h4>
        <ul class="mt-2 text-sm text-blue-700 dark:text-blue-300 list-disc list-inside">
          <li>Each line must be a valid JSON object</li>
          <li>Required fields: <code class="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">messageContent</code> (string) and <code class="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">label</code> (boolean)</li>
          <li>Example: <code class="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">{"messageContent": "Hello world", "label": true}</code></li>
        </ul>
        <div class="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
          <p class="text-sm text-blue-700 dark:text-blue-300">
            Need to convert a CSV file to JSONL? 
            <router-link 
              to="/csv-to-jsonl" 
              class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              Use our CSV to JSONL converter
            </router-link>
          </p>
          <p class="text-sm text-blue-700 dark:text-blue-300 mt-2">
            Need a template to get started? 
            <a 
              href="/sample-dataset.jsonl" 
              download="sample-dataset.jsonl"
              class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              Download sample JSONL file
            </a>
          </p>
        </div>
      </div>
      
      <!-- Error Message -->
      <div v-if="error" class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-4">
        <div class="text-sm text-red-800 dark:text-red-300">{{ error }}</div>
      </div>
      
      <!-- Submit Buttons -->
      <div class="flex justify-end space-x-3">
        <button
          type="button"
          @click="handleCreateBlank"
          :disabled="isUploading || !form.name"
          class="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg v-if="isUploading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isUploading ? 'Creating...' : 'Create Blank Dataset' }}
        </button>
        <button
          type="submit"
          :disabled="isUploading || !form.name || !selectedFile"
          class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg v-if="isUploading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isUploading ? 'Uploading...' : 'Upload Dataset' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useDatasetsStore } from '@/stores/datasets'
import configService from '@/services/config'

export default {
  name: 'DatasetUpload',
  emits: ['uploaded'],
  setup(props, { emit }) {
    const datasetsStore = useDatasetsStore()
    const fileInput = ref(null)
    const selectedFile = ref(null)
    const form = ref({
      name: ''
    })
    const config = ref({})
    
    const isUploading = computed(() => datasetsStore.isUploading)
    const error = computed(() => datasetsStore.error)
    const maxFileSize = computed(() => config.value.maxFileSizeMB || 50)
    
    const handleFileChange = (event) => {
      const file = event.target.files[0]
      if (file) {
        selectedFile.value = file
        datasetsStore.clearError()
      }
    }
    
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }
    
    const handleSubmit = async () => {
      if (!form.value.name || !selectedFile.value) return
      
      try {
        await datasetsStore.createDataset(form.value.name, selectedFile.value)
        
        // Reset form
        form.value.name = ''
        selectedFile.value = null
        if (fileInput.value) {
          fileInput.value.value = ''
        }
        
        emit('uploaded')
      } catch (error) {
        // Error is handled by the store
      }
    }
    
    const handleCreateBlank = async () => {
      if (!form.value.name) return
      
      try {
        await datasetsStore.createBlankDataset(form.value.name)
        
        // Reset form
        form.value.name = ''
        selectedFile.value = null
        if (fileInput.value) {
          fileInput.value.value = ''
        }
        
        emit('uploaded')
      } catch (error) {
        // Error is handled by the store
      }
    }
    
    onMounted(async () => {
      try {
        config.value = await configService.getConfig()
      } catch (error) {
        console.error('Failed to fetch config:', error)
      }
    })
    
    return {
      form,
      selectedFile,
      fileInput,
      isUploading,
      error,
      maxFileSize,
      handleFileChange,
      handleSubmit,
      handleCreateBlank,
      formatFileSize
    }
  }
}
</script>