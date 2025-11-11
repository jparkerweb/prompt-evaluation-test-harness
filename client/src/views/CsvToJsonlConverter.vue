<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
    <nav class="bg-white dark:bg-gray-800 shadow sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <div class="flex items-center space-x-2">
                <img src="/assets/score.png" alt="Score" class="h-6 w-6">
                <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Prompt Evaluation Test Harness</h1>
              </div>
            </div>
            <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
              <router-link
                to="/"
                class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Dashboard
              </router-link>
              <router-link
                to="/datasets"
                class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Datasets
              </router-link>
              <router-link
                to="/prompts"
                class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Prompts
              </router-link>
              <router-link
                to="/evaluations"
                class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Evaluations
              </router-link>
              <router-link
                to="/csv-to-jsonl"
                class="border-indigo-500 text-gray-900 dark:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                CSV to JSONL
              </router-link>
            </div>
          </div>
          <div class="flex items-center">
            <ThemeToggle />
            <span class="text-sm text-gray-500 dark:text-gray-300 mr-4 ml-4">{{ user?.username }}</span>
            <button
              @click="logout"
              class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
    
    <main class="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 sm:px-0">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">CSV to JSONL Converter</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Convert CSV files to JSONL format for dataset uploads
          </p>
        </div>

        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <!-- Upload Area -->
          <div 
            @click="triggerFileInput"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
            :class="[
              'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200',
              isDragOver 
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            ]"
          >
            <div class="text-6xl mb-4">📁</div>
            <p class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Click to select a CSV file
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              or drag and drop it here
            </p>
            <input
              ref="fileInput"
              type="file"
              accept=".csv"
              @change="handleFileChange"
              class="hidden"
            >
          </div>

          <!-- Status Messages -->
          <div v-if="status" :class="[
            'mt-6 p-4 rounded-md',
            status.type === 'error' 
              ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
              : status.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
              : 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
          ]">
            <div v-if="status.type === 'success'" v-html="status.message"></div>
            <div v-else>{{ status.message }}</div>
          </div>

          <!-- Download Button -->
          <div v-if="jsonlContent" class="mt-6 flex justify-center">
            <button
              @click="downloadJsonl"
              class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Download JSONL File
            </button>
          </div>

          <!-- Preview -->
          <div v-if="preview" class="mt-6">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Preview (first 5 lines):</h4>
            <div class="bg-gray-100 dark:bg-gray-700 rounded-md p-4 font-mono text-sm max-h-64 overflow-y-auto">
              <pre class="whitespace-pre-wrap text-gray-800 dark:text-gray-200">{{ preview }}</pre>
            </div>
          </div>

          <!-- Format Help -->
          <div class="mt-8 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <h4 class="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Expected CSV Format:</h4>
            <ul class="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
              <li>First row should contain column headers</li>
              <li>Include columns for <code class="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">messageContent</code> and <code class="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">label</code></li>
              <li>The <code class="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">label</code> column should contain boolean values (true/false)</li>
              <li>Additional columns are allowed and will be preserved in the JSONL output</li>
            </ul>
            <div class="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
              <p class="text-sm text-blue-700 dark:text-blue-300">
                Need a template to get started? 
                <a 
                  href="/sample-dataset.csv" 
                  download="sample-dataset.csv"
                  class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  Download sample CSV file
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'

export default {
  name: 'CsvToJsonlConverter',
  components: {
    ThemeToggle
  },
  setup() {
    const authStore = useAuthStore()
    const fileInput = ref(null)
    const isDragOver = ref(false)
    const status = ref(null)
    const jsonlContent = ref('')
    const currentFileName = ref('')
    const preview = ref('')
    
    const user = computed(() => authStore.currentUser)
    
    const logout = () => authStore.logout()
    
    const triggerFileInput = () => {
      fileInput.value?.click()
    }
    
    const handleDragOver = (e) => {
      e.preventDefault()
      isDragOver.value = true
    }
    
    const handleDragLeave = () => {
      isDragOver.value = false
    }
    
    const handleDrop = (e) => {
      e.preventDefault()
      isDragOver.value = false
      
      const files = e.dataTransfer.files
      if (files.length > 0 && files[0].name.endsWith('.csv')) {
        handleFile(files[0])
      } else {
        showError('Please select a CSV file')
      }
    }
    
    const handleFileChange = (e) => {
      if (e.target.files.length > 0) {
        handleFile(e.target.files[0])
      }
    }
    
    const showError = (message) => {
      status.value = { type: 'error', message }
      jsonlContent.value = ''
      preview.value = ''
    }
    
    const showSuccess = (message) => {
      status.value = { type: 'success', message }
    }
    
    const showInfo = (message) => {
      status.value = { type: 'info', message }
    }
    
    const parseCSV = (text) => {
      return new Promise((resolve, reject) => {
        try {
          const lines = text.split('\n').filter(line => line.trim())
          if (lines.length < 2) {
            throw new Error('CSV file must have at least a header row and one data row')
          }
          
          const headers = parseCSVLine(lines[0])
          const data = []
          
          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i])
            if (values.length !== headers.length) {
              console.warn(`Line ${i + 1} has ${values.length} values but expected ${headers.length}`)
              continue
            }
            
            const row = {}
            headers.forEach((header, index) => {
              let value = values[index]
              
              // Try to convert to appropriate types
              if (value === 'true' || value === 'TRUE') {
                value = true
              } else if (value === 'false' || value === 'FALSE') {
                value = false
              } else if (!isNaN(value) && value !== '') {
                const num = parseFloat(value)
                if (Number.isInteger(num)) {
                  value = parseInt(value)
                } else {
                  value = num
                }
              }
              
              row[header] = value
            })
            data.push(row)
          }
          
          resolve({ data, errors: [] })
        } catch (error) {
          reject(error)
        }
      })
    }
    
    const parseCSVLine = (line) => {
      const result = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      
      result.push(current.trim())
      return result
    }
    
    const handleFile = async (file) => {
      if (!file.name.endsWith('.csv')) {
        showError('Please select a CSV file')
        return
      }
      
      currentFileName.value = file.name.replace('.csv', '')
      showInfo('Reading CSV file...')
      
      try {
        const text = await file.text()
        showInfo('Parsing CSV data...')
        
        const parsed = await parseCSV(text)
        
        if (parsed.errors.length > 0) {
          throw new Error('CSV parsing errors: ' + parsed.errors.join(', '))
        }
        
        showInfo('Converting to JSONL format...')
        
        const jsonlLines = parsed.data.map(row => JSON.stringify(row))
        jsonlContent.value = jsonlLines.join('\n')
        
        const previewLines = jsonlLines.slice(0, 5).map((line, i) => {
          const truncated = line.length > 200 ? line.substring(0, 200) + '...' : line
          return `Line ${i + 1}: ${truncated}`
        }).join('\n\n')
        
        preview.value = previewLines
        
        showSuccess(`
          <strong>Conversion successful!</strong><br>
          File: ${file.name}<br>
          Converted ${parsed.data.length} rows to JSONL format<br>
          Total size: ${(jsonlContent.value.length / 1024).toFixed(2)} KB
        `)
        
      } catch (error) {
        showError('Error: ' + error.message)
        console.error('Conversion error:', error)
      }
    }
    
    const downloadJsonl = () => {
      if (!jsonlContent.value) return
      
      const blob = new Blob([jsonlContent.value], { type: 'application/jsonl' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = currentFileName.value + '.jsonl'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
    
    return {
      user,
      fileInput,
      isDragOver,
      status,
      jsonlContent,
      preview,
      logout,
      triggerFileInput,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleFileChange,
      downloadJsonl
    }
  }
}
</script>