<template>
  <div
    class="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
    @click="handleBackdropClick"
  >
    <div 
      class="relative w-full max-w-6xl mx-4 h-[90vh] flex flex-col bg-white dark:bg-gray-800 rounded-md shadow-lg"
      @click.stop
    >
      <!-- Fixed Header -->
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-start">
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            {{ evaluation?.name || 'Evaluation Details' }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400" v-if="evaluation">
            ID: {{ evaluation?.id || 'Loading...' }} • 
            Created by <span class="text-sm text-blue-600 dark:text-blue-400 truncate">{{ evaluation?.created_by_username || 'Unknown' }}</span> • 
            {{ evaluation?.created_at ? formatDate(evaluation.created_at) : 'Unknown date' }}
          </p>
        </div>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Scrollable Content Area -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        <!-- SIMPLIFIED TEMPLATE - Show content if we have data, loading if we don't -->
        <div v-if="evaluation" class="space-y-6">
          <div class="p-4 bg-green-50 border border-green-200 rounded mb-4">
            <p class="text-xs text-green-800">SUCCESS: Evaluation loaded - ID: {{ evaluation.id }}, Name: {{ evaluation.name }}</p>
          </div>
        <!-- Status and Progress -->
        <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg" v-if="evaluation">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white">Status & Progress</h4>
            <button
              v-if="evaluation && evaluation.status === 'running'"
              @click="refreshEvaluation"
              class="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Refresh
            </button>
          </div>
          
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</dt>
              <dd class="mt-1">
                <span :class="getStatusBadgeClass(evaluation?.status)" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
                  {{ getStatusText(evaluation?.status || 'unknown') }}
                </span>
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Progress</dt>
              <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {{ evaluation?.processed_messages || 0 }} / {{ evaluation?.total_messages || 0 }} messages
              </dd>
            </div>
            <div v-if="evaluation?.started_at">
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Started</dt>
              <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ formatDate(evaluation.started_at) }}</dd>
            </div>
            <div v-if="evaluation?.completed_at">
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Completed</dt>
              <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ formatDate(evaluation.completed_at) }}</dd>
            </div>
          </div>
          
          <!-- Progress Bar -->
          <div v-if="evaluation && (evaluation.status === 'running' || evaluation.status === 'completed')" class="mt-4">
            <div class="flex items-center justify-between text-sm mb-1">
              <span class="text-gray-600 dark:text-gray-400">Processing Progress</span>
              <span class="text-gray-900 dark:text-gray-100 font-medium">{{ getProgressPercentage(evaluation) }}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div 
                class="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                :style="{ width: `${getProgressPercentage(evaluation)}%` }"
              ></div>
            </div>
            
            <!-- Active LLM Calls Display -->
            <div v-if="evaluation && evaluation.status === 'running'" class="mt-3">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-gray-600 dark:text-gray-400">Active LLM Calls</span>
                <span class="text-gray-900 dark:text-gray-100 font-medium">
                  {{ activeLLMCalls.value.size }} / {{ maxConcurrentCalls }}
                </span>
              </div>
              <div class="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  class="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-400 dark:to-pink-400 rounded-full transition-all duration-300 ease-out"
                  :style="{ width: `${getLLMCallsPercentage()}%` }"
                >
                  <div class="absolute inset-0 bg-white/20 animate-pulse" v-if="activeLLMCalls.value.size > 0"></div>
                </div>
                <!-- Percentage text overlay -->
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-xs font-medium text-gray-700 dark:text-gray-300" v-if="activeLLMCalls.value.size > 0">
                    {{ Math.round(getLLMCallsPercentage()) }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Configuration -->
        <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg" v-if="evaluation">
          <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Configuration</h4>
          <dl class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <div>
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Prompt</dt>
              <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ evaluation?.prompt_name || `Prompt #${evaluation?.prompt_id || 'Unknown'}` }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Dataset</dt>
              <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ evaluation?.dataset_name || 'Unknown' }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Model</dt>
              <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">{{ evaluation?.model_id || 'Unknown' }}</dd>
            </div>
            <div v-if="getEvaluationDuration(evaluation)">
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Duration</dt>
              <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ getEvaluationDuration(evaluation) }}</dd>
            </div>
          </dl>
          
          <div v-if="evaluation?.description" class="mt-3">
            <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Description</dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ evaluation?.description }}</dd>
          </div>
        </div>
        
        <!-- Statistics -->
        <div v-if="stats && evaluation.status === 'completed'" class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Results Summary</h4>
          <dl class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Accuracy</dt>
              <dd class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{{ stats.accuracy }}%</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Correct Predictions</dt>
              <dd class="mt-1">
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    v-model="showCorrect"
                    class="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
                  >
                  <span class="text-lg font-semibold text-green-600 dark:text-green-400">{{ stats.correctPredictions }}</span>
                </label>
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Incorrect Predictions</dt>
              <dd class="mt-1">
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    v-model="showIncorrect"
                    class="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 rounded"
                  >
                  <span class="text-lg font-semibold text-red-600 dark:text-red-400">{{ stats?.incorrectPredictions || 0 }}</span>
                </label>
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Errors</dt>
              <dd class="mt-1">
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    v-model="showErrors"
                    class="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 rounded"
                  >
                  <span class="text-lg font-semibold text-red-600 dark:text-red-400">{{ stats.errorCount }}</span>
                </label>
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Avg Response Time</dt>
              <dd class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{{ Math.round(stats.avgResponseTime) }}ms</dd>
            </div>
          </dl>
        </div>
        
        <!-- Tab Navigation -->
        <div class="border-b border-gray-200 dark:border-gray-700">
          <nav class="-mb-px flex space-x-8">
            <button
              @click="activeTab = 'results'"
              :class="[
                'py-2 px-1 border-b-2 font-medium text-sm',
                activeTab === 'results' 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              ]"
            >
              Results ({{ filteredResults?.length || 0 }} of {{ filteredPagination?.total || 0 }})
            </button>
            <button
              @click="activeTab = 'prompt'"
              :class="[
                'py-2 px-1 border-b-2 font-medium text-sm',
                activeTab === 'prompt' 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              ]"
            >
              Prompt Details
            </button>
          </nav>
        </div>
        
        <!-- Tab Content -->
        <div class="mt-4">
          <!-- Results Tab -->
          <div v-if="activeTab === 'results'">
            <div v-if="filteredResults && filteredResults.length > 0" class="space-y-4">
              <div 
                v-for="result in filteredResults" 
                :key="result.id"
                class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
              >
                <div class="flex items-start justify-between mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-sm font-medium text-gray-900 dark:text-white">Message {{ result.dataset_message_id }}</span>
                    <span v-if="result.error_message" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                      Error
                    </span>
                    <span v-else-if="result.llmLabel === result.expected_label" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                      Correct
                    </span>
                    <span v-else class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                      Incorrect
                    </span>
                  </div>
                  <span v-if="result.response_time_ms" class="text-xs text-gray-500 dark:text-gray-400">{{ result.response_time_ms }}ms</span>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <h5 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Input Message</h5>
                    </div>
                    <div class="text-sm break-words text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-2 rounded border border-gray-300 dark:border-gray-600 max-h-24 overflow-y-auto">
                      {{ result.messageContent }}
                    </div>
                  </div>
                  
                  <div v-if="!result.error_message">
                    <div class="flex items-center justify-between mb-1">
                      <h5 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">LLM Response</h5>
                    </div>
                    <div class="text-sm break-words text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-2 rounded border border-gray-300 dark:border-gray-600 max-h-24 overflow-y-auto">
                      {{ result.llmFullResponse }}
                    </div>
                  </div>
                  
                  <div v-if="result.error_message">
                    <h5 class="text-xs font-medium text-red-500 dark:text-red-400 uppercase tracking-wide mb-1">Error</h5>
                    <div class="text-sm text-red-900 bg-red-50 dark:text-red-200 dark:bg-red-900/30 p-2 rounded border border-red-200 dark:border-red-800">
                      {{ result.error_message }}
                    </div>
                  </div>
                </div>
                
                <div v-if="!result.error_message" class="mt-2 flex items-center space-x-4 text-xs text-gray-700 dark:text-gray-300">
                  <span>
                    <strong>Expected: </strong> 
                    <span :class="result.expected_label ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                      {{ result.expected_label ? 'true' : 'false' }}
                    </span>
                  </span>
                  <span>
                    <strong>Predicted: </strong> 
                    <span v-if="result.llmLabel !== null" :class="result.llmLabel ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                      {{ result.llmLabel ? 'true' : 'false' }}
                    </span>
                    <span v-else class="text-gray-500 dark:text-gray-400">null</span>
                  </span>
                  <button
                        @click="showHtmlPreview(result.messageContent)"
                        class="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/75 transition-colors"
                      >
                        HTML VIEW
                  </button>
                </div>
              </div>
            </div>
            
            <div v-else-if="results && results.length > 0" class="text-center py-8">
              <p class="text-gray-500 dark:text-gray-400">No results match the current filters.</p>
            </div>
            
            <div v-else-if="evaluation.status === 'completed'" class="text-center py-8">
              <p class="text-gray-500 dark:text-gray-400">No results found for this evaluation.</p>
            </div>
            
            <div v-else class="text-center py-8">
              <p class="text-gray-500 dark:text-gray-400">Results will be available once the evaluation starts running.</p>
            </div>
          </div>
          
          <!-- Prompt Tab -->
          <div v-if="activeTab === 'prompt'" class="space-y-6">
            <!-- Configuration -->
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Configuration</h4>
              <dl class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Model ID</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">{{ evaluation.model_id }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Expected Output Format</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    <code class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs mr-1">{{ evaluation.prompt_opening_tag }}</code>...
                    <code class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs ml-1">{{ evaluation.prompt_closing_tag }}</code>
                  </dd>
                </div>
                <div v-if="evaluation.prompt_parent_name">
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Parent Prompt</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ evaluation.prompt_parent_name }}</dd>
                </div>
                <div v-if="evaluation.prompt_max_tokens">
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Max Tokens</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ evaluation.prompt_max_tokens }}</dd>
                </div>
                <div v-if="evaluation.prompt_temperature !== null && evaluation.prompt_temperature !== undefined">
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Temperature</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ evaluation.prompt_temperature }}</dd>
                </div>
                <div v-if="evaluation.prompt_top_p !== null && evaluation.prompt_top_p !== undefined">
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Top P</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ evaluation.prompt_top_p }}</dd>
                </div>
              </dl>
              
              <div v-if="evaluation.prompt_stop_sequences && evaluation.prompt_stop_sequences.length > 0" class="mt-3">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Stop Sequences</dt>
                <dd class="mt-1">
                  <div class="flex flex-wrap gap-2">
                    <span 
                      v-for="sequence in evaluation.prompt_stop_sequences" 
                      :key="sequence"
                      class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-mono"
                    >
                      {{ sequence }}
                    </span>
                  </div>
                </dd>
              </div>
            </div>
            
            <!-- Prompt Text -->
            <div>
              <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Prompt Text</h4>
              <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-300 dark:border-gray-600">
                <pre class="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100 font-mono">{{ evaluation.prompt_text }}</pre>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
      
      <!-- Fixed Footer Actions -->
      <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <!-- Results Pagination -->
          <div v-if="activeTab === 'results' && filteredPagination && filteredPagination.totalPages > 1">
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                @click="goToFirstResultsPage"
                :disabled="currentFilterPage <= 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                First
              </button>
              <button
                @click="goToPreviousResultsPage"
                :disabled="currentFilterPage <= 1"
                class="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Previous
              </button>
              <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ currentFilterPage }} / {{ filteredPagination.totalPages }}
              </span>
              <button
                @click="goToNextResultsPage"
                :disabled="currentFilterPage >= filteredPagination.totalPages"
                class="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Next
              </button>
              <button
                @click="goToLastResultsPage"
                :disabled="currentFilterPage >= filteredPagination.totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Last
              </button>
            </nav>
          </div>
          <div v-else>
            <!-- Empty space to maintain layout balance -->
          </div>
          
          <!-- Action Buttons -->
          <div class="flex space-x-3">
            <button
              v-if="evaluation && evaluation.status === 'pending'"
              @click="handleStart"
              :disabled="isStarting"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              <span v-if="isStarting" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting...
              </span>
              <span v-else>Start Evaluation</span>
            </button>
            
            <!-- Retry Errors Button for completed/failed evaluations with errors -->
            <button
              v-if="evaluation && (evaluation.status === 'completed' || evaluation.status === 'failed') && stats && stats.errorCount > 0"
              @click="handleRetryErrors"
              :disabled="isRetryingErrors"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              <span v-if="isRetryingErrors" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Retrying...
              </span>
              <span v-else class="flex items-center">
                <svg class="-ml-1 mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                </svg>
                Retry Errors ({{ stats.errorCount }})
              </span>
            </button>
            <button
              v-if="evaluation && evaluation.status === 'running'"
              @click="handlePause"
              :disabled="isPausing"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
            >
              <span v-if="isPausing" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Pausing...
              </span>
              <span v-else class="flex items-center">
                <svg class="-ml-1 mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                Pause Evaluation
              </span>
            </button>
            <button
              v-if="evaluation && (evaluation.status === 'paused' || (evaluation.status === 'failed' && evaluation.can_resume))"
              @click="handleResume"
              :disabled="isResuming"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <span v-if="isResuming" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Resuming...
              </span>
              <span v-else>Resume Evaluation</span>
            </button>
            <button
              @click="$emit('close')"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
        
      <!-- Fixed Footer Actions -->
      <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <!-- Results Pagination -->
          <div v-if="activeTab === 'results' && filteredPagination && filteredPagination.totalPages > 1">
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                @click="goToFirstResultsPage"
                :disabled="currentFilterPage <= 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                First
              </button>
              <button
                @click="goToPreviousResultsPage"
                :disabled="currentFilterPage <= 1"
                class="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Previous
              </button>
              <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ currentFilterPage }} / {{ filteredPagination.totalPages }}
              </span>
              <button
                @click="goToNextResultsPage"
                :disabled="currentFilterPage >= filteredPagination.totalPages"
                class="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Next
              </button>
              <button
                @click="goToLastResultsPage"
                :disabled="currentFilterPage >= filteredPagination.totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Last
              </button>
            </nav>
          </div>
          <div v-else>
            <!-- Empty space to maintain layout balance -->
          </div>
          
          <!-- Action Buttons -->
          <div class="flex space-x-3">
            <button
              v-if="evaluation?.status === 'pending'"
              @click="handleStart"
              :disabled="isStarting"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              <span v-if="isStarting" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting...
              </span>
              <span v-else>Start Evaluation</span>
            </button>
            
            <!-- Retry Errors Button for completed/failed evaluations with errors -->
            <button
              v-if="evaluation && (evaluation.status === 'completed' || evaluation.status === 'failed') && stats && stats.errorCount > 0"
              @click="handleRetryErrors"
              :disabled="isRetryingErrors"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              <span v-if="isRetryingErrors" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Retrying...
              </span>
              <span v-else class="flex items-center">
                <svg class="-ml-1 mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                </svg>
                Retry Errors ({{ stats.errorCount }})
              </span>
            </button>
            <button
              v-if="evaluation?.status === 'running'"
              @click="handlePause"
              :disabled="isPausing"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
            >
              <span v-if="isPausing" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Pausing...
              </span>
              <span v-else class="flex items-center">
                <svg class="-ml-1 mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                Pause Evaluation
              </span>
            </button>
            <button
              v-if="evaluation && (evaluation.status === 'paused' || (evaluation.status === 'failed' && evaluation.can_resume))"
              @click="handleResume"
              :disabled="isResuming"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <span v-if="isResuming" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Resuming...
              </span>
              <span v-else>Resume Evaluation</span>
            </button>
            <button
              @click="$emit('close')"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
        
      <!-- Loading State - Show if no evaluation data -->
      <div v-else class="flex-1 overflow-y-auto px-6 py-4">
        <div v-else class="p-8 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p class="mt-2 text-sm text-gray-500">Loading evaluation details...</p>
          <p class="text-xs text-gray-400 mt-2">EvaluationId: {{ props.evaluationId }}</p>
          <button @click="loadEvaluationData" class="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded">Force Reload</button>
        </div>
      </div>
    </div>
    
    <!-- HTML Preview Modal -->
    <HtmlPreviewModal
      v-if="showHtmlPreviewModal"
      :htmlContent="htmlPreviewContent"
      @close="closeHtmlPreview"
    />
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useEvaluationsStore } from '@/stores/evaluations'
import { formatDate } from '@/utils/dateFormat'
import configService from '@/services/config'
import HtmlPreviewModal from '@/components/common/HtmlPreviewModal.vue'
import DOMPurify from 'dompurify'

export default {
  name: 'EvaluationDetail',
  components: {
    HtmlPreviewModal
  },
  props: {
    evaluationId: {
      type: Number,
      required: true
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const evaluationsStore = useEvaluationsStore()
    const activeTab = ref('results')
    const localLoading = ref(false) // Local loading state - start false
    
    // Filter states for results
    const showCorrect = ref(true)
    const showIncorrect = ref(true)
    const showErrors = ref(true)
    
    // Action states
    const isStarting = ref(false)
    const isPausing = ref(false)
    const isResuming = ref(false)
    const isRetryingErrors = ref(false)
    
    // Use direct reactive reference instead of computed to avoid reactivity issues
    const { currentEvaluation: evaluation } = storeToRefs(evaluationsStore)
    
    // Add a watcher to log changes
    watch(evaluation, (newVal) => {
      if (newVal) {
        console.log('✨ Component received evaluation:', newVal.name, 'ID:', newVal.id)
      } else {
        console.log('⚠️ Component evaluation is null')
      }
    }, { deep: true, immediate: true })
    const results = computed(() => evaluationsStore.currentResults)
    const stats = computed(() => evaluationsStore.currentStats)
    const resultsPagination = computed(() => evaluationsStore.resultsPagination)
    // Simplified - just check if we have evaluation data
    const isLoading = computed(() => {
      const hasData = !!evaluation.value
      if (!hasData) console.log('🔄 Still waiting for evaluation data...')
      return !hasData
    })
    const activeLLMCalls = computed(() => evaluationsStore.activeLLMCalls)
    const maxConcurrentCalls = ref(5) // Default value, will be updated from config
    
    // Track current filter page
    const currentFilterPage = ref(1)
    const filterPageSize = 50
    
    // HTML Preview modal state
    const showHtmlPreviewModal = ref(false)
    const htmlPreviewContent = ref('')
    
    // Reset filter page when filters change
    watch([showCorrect, showIncorrect, showErrors], () => {
      currentFilterPage.value = 1
    })
    
    // Get all results for current evaluation to properly filter
    const allFilteredResults = ref([])
    
    // Fetch all results when filters change or evaluation changes
    const fetchAllFilteredResults = async () => {
      if (!evaluation.value || evaluation.value.status === 'pending') return
      
      allFilteredResults.value = []
      let page = 1
      let hasMore = true
      
      while (hasMore) {
        try {
          const response = await evaluationsStore.fetchEvaluationResults(props.evaluationId, page, 100)
          const filtered = response.filter(result => {
            if (result.error_message) {
              return showErrors.value
            } else if (result.llmLabel === result.expected_label) {
              return showCorrect.value
            } else {
              return showIncorrect.value
            }
          })
          allFilteredResults.value.push(...filtered)
          
          // Check if there are more pages
          hasMore = resultsPagination.value && page < resultsPagination.value.totalPages
          page++
        } catch (error) {
          console.error('Failed to fetch results page:', error)
          hasMore = false
        }
      }
    }
    
    // Watch for filter changes
    watch([showCorrect, showIncorrect, showErrors, () => evaluation.value?.id], () => {
      fetchAllFilteredResults()
    })
    
    // Filtered results for current page
    const filteredResults = computed(() => {
      const start = (currentFilterPage.value - 1) * filterPageSize
      const end = start + filterPageSize
      return allFilteredResults.value.slice(start, end)
    })
    
    // Filtered pagination
    const filteredPagination = computed(() => {
      const total = allFilteredResults.value.length
      const totalPages = Math.ceil(total / filterPageSize)
      return {
        page: currentFilterPage.value,
        pageSize: filterPageSize,
        total,
        totalPages
      }
    })
    
    
    const getStatusBadgeClass = (status) => {
      if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
      switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
        case 'running': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
        case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
        case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
        case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
      }
    }
    
    const getStatusText = (status) => {
      if (!status) return 'Unknown'
      switch (status) {
        case 'pending': return 'Pending'
        case 'running': return 'Running'
        case 'completed': return 'Completed'
        case 'paused': return 'Paused'
        case 'failed': return 'Failed'
        default: return status
      }
    }
    
    const getProgressPercentage = (evaluation) => {
      if (!evaluation || !evaluation.total_messages) return 0
      const processed = evaluation.processed_messages || 0
      return Math.round((processed / evaluation.total_messages) * 100)
    }
    
    const getLLMCallsPercentage = () => {
      if (!maxConcurrentCalls.value || maxConcurrentCalls.value === 0) return 0
      return Math.min(100, (activeLLMCalls.value.size / maxConcurrentCalls.value) * 100)
    }
    
    const refreshEvaluation = async () => {
      await evaluationsStore.refreshEvaluation(props.evaluationId)
    }
    
    const goToFirstResultsPage = () => {
      currentFilterPage.value = 1
    }
    
    const goToPreviousResultsPage = () => {
      if (currentFilterPage.value > 1) {
        currentFilterPage.value--
      }
    }
    
    const goToNextResultsPage = () => {
      if (currentFilterPage.value < filteredPagination.value.totalPages) {
        currentFilterPage.value++
      }
    }
    
    const goToLastResultsPage = () => {
      currentFilterPage.value = filteredPagination.value.totalPages
    }
    
    const loadEvaluationData = async () => {
      console.log('[DEBUG] loadEvaluationData called with evaluationId:', props.evaluationId)
      if (!props.evaluationId) {
        console.log('[DEBUG] No evaluationId provided, returning')
        return
      }
      
      localLoading.value = true
      console.log('[DEBUG] Set localLoading to true')
      
      try {
        console.log('[DEBUG] Calling fetchEvaluationById...')
        // Always fetch fresh data
        const result = await evaluationsStore.fetchEvaluationById(props.evaluationId)
        console.log('[DEBUG] fetchEvaluationById result:', result)
        console.log('[DEBUG] Store currentEvaluation after fetch:', evaluationsStore.currentEvaluation)
        console.log('[DEBUG] Component evaluation after fetch:', evaluation.value)
        
        if (!result) {
          console.error('[DEBUG] Failed to load evaluation - null result')
          return
        }
        
        // Force reactivity update
        await nextTick()
        console.log('[DEBUG] After nextTick - evaluation.value:', evaluation.value)
        
        // Only load results for completed/failed evaluations initially
        if (evaluation.value && (evaluation.value.status === 'completed' || evaluation.value.status === 'failed')) {
          console.log('[DEBUG] Loading results for completed/failed evaluation')
          await Promise.all([
            evaluationsStore.fetchEvaluationResults(props.evaluationId),
            evaluationsStore.fetchEvaluationStats(props.evaluationId)
          ])
          await fetchAllFilteredResults()
        } else if (evaluation.value && evaluation.value.status === 'paused') {
          console.log('[DEBUG] Loading results for paused evaluation')
          // For paused evaluations, load partial results
          await Promise.all([
            evaluationsStore.fetchEvaluationResults(props.evaluationId),
            evaluationsStore.fetchEvaluationStats(props.evaluationId)
          ])
        }
        // For running evaluations, start streaming but don't load results initially
        if (evaluation.value && evaluation.value.status === 'running') {
          console.log('[DEBUG] Starting polling for running evaluation')
          evaluationsStore.startPolling(props.evaluationId)
        }
      } catch (error) {
        console.error('[DEBUG] Error in loadEvaluationData:', error)
      } finally {
        // Always set loading to false, even on error
        console.log('[DEBUG] Setting localLoading to false')
        localLoading.value = false
        
        // Force another reactivity check
        await nextTick()
        console.log('[DEBUG] Final state - evaluation:', evaluation.value, 'isLoading:', isLoading.value)
      }
    }
    
    // Start polling for running evaluations and load data when completed
    watch(() => evaluation.value?.status, async (newStatus, oldStatus) => {
      if (newStatus === 'running') {
        evaluationsStore.startPolling(props.evaluationId)
        
        // If transitioning from pending/paused to running, reload the evaluation data
        if (oldStatus === 'pending' || oldStatus === 'paused') {
          await loadEvaluationData()
        }
        // Set appropriate tab for running evaluation
        activeTab.value = 'prompt'
      } else if (oldStatus === 'running' && newStatus !== 'running') {
        // Stop polling when evaluation is no longer running
        evaluationsStore.stopPolling(props.evaluationId)
        
        // When evaluation completes, automatically load results and stats
        if (newStatus === 'completed') {
          try {
            await evaluationsStore.fetchEvaluationResults(props.evaluationId)
            await evaluationsStore.fetchEvaluationStats(props.evaluationId)
            // Trigger filtered results fetch
            await fetchAllFilteredResults()
            
            // Add a delayed refresh to ensure all completion data is available
            setTimeout(async () => {
              try {
                await evaluationsStore.fetchEvaluationStats(props.evaluationId)
                await fetchAllFilteredResults()
              } catch (error) {
                console.error('Failed to load delayed completion data:', error)
              }
            }, 1500) // 1.5 second delay
          } catch (error) {
            console.error('Failed to load completion data:', error)
          }
        }
      }
    }, { immediate: true })
    
    // Load data when component mounts or evaluationId changes
    watch(() => props.evaluationId, async (newId, oldId) => {
      console.log('[DEBUG] evaluationId watcher triggered with:', newId, 'old:', oldId)
      if (newId) {
        await loadEvaluationData()
        // Set default tab based on evaluation status
        if (evaluation.value && evaluation.value.status === 'running') {
          console.log('[DEBUG] Setting activeTab to prompt')
          activeTab.value = 'prompt' // Show prompt tab for running evaluations to avoid loading results
        } else {
          console.log('[DEBUG] Setting activeTab to results')
          activeTab.value = 'results' // Show results tab for completed/failed/paused evaluations
        }
      }
    }, { immediate: true })
    
    // Load results when switching to Results tab for running evaluations
    watch(activeTab, async (newTab) => {
      if (newTab === 'results' && evaluation.value && evaluation.value.status === 'running') {
        // Only load if we don't have results yet
        if (!results.value || results.value.length === 0) {
          try {
            await evaluationsStore.fetchEvaluationResults(props.evaluationId)
            await fetchAllFilteredResults()
          } catch (error) {
            console.error('Failed to load results for running evaluation:', error)
          }
        }
      }
    })
    
    // Fetch configuration on mount
    onMounted(async () => {
      try {
        const config = await configService.getConfig()
        maxConcurrentCalls.value = config.maxConcurrentLLMRequests || 5
      } catch (error) {
        console.error('Failed to fetch configuration:', error)
      }
    })
    
    // Clean up polling when component unmounts
    onUnmounted(() => {
      if (evaluation.value?.status === 'running') {
        evaluationsStore.stopPolling(props.evaluationId)
      }
      // Clear current evaluation when modal closes
      evaluationsStore.clearCurrentEvaluation()
    })
    
    const handleBackdropClick = () => {
      emit('close')
    }
    
    const handlePause = async () => {
      isPausing.value = true
      try {
        await evaluationsStore.pauseEvaluation(props.evaluationId)
      } catch (error) {
        console.error('Failed to pause evaluation:', error)
      } finally {
        isPausing.value = false
      }
    }
    
    const handleStart = async () => {
      isStarting.value = true
      try {
        console.log('Starting evaluation:', props.evaluationId)
        await evaluationsStore.startEvaluation(props.evaluationId)
        console.log('Evaluation started, status should be:', evaluation.value?.status)
        // The status watcher will handle loading data and setting the appropriate tab
      } catch (error) {
        console.error('Failed to start evaluation:', error)
      } finally {
        isStarting.value = false
      }
    }
    
    const handleResume = async () => {
      isResuming.value = true
      try {
        await evaluationsStore.resumeEvaluation(props.evaluationId)
        // Ensure evaluation data is reloaded after resume
        await loadEvaluationData()
      } catch (error) {
        console.error('Failed to resume evaluation:', error)
      } finally {
        isResuming.value = false
      }
    }
    
    const handleRetryErrors = async () => {
      isRetryingErrors.value = true
      try {
        await evaluationsStore.retryErrors(props.evaluationId)
        // Ensure evaluation data is reloaded after retry
        await loadEvaluationData()
      } catch (error) {
        console.error('Failed to retry errors:', error)
      } finally {
        isRetryingErrors.value = false
      }
    }
    
    const showHtmlPreview = (content) => {
      htmlPreviewContent.value = DOMPurify.sanitize(content)
      showHtmlPreviewModal.value = true
    }
    
    const closeHtmlPreview = () => {
      showHtmlPreviewModal.value = false
      htmlPreviewContent.value = ''
    }
    
    const getEvaluationDuration = (evaluation) => {
      if (!evaluation || !evaluation.started_at) return null
      
      const startTime = new Date(evaluation.started_at)
      const endTime = evaluation.completed_at ? new Date(evaluation.completed_at) : new Date()
      const durationMs = endTime - startTime
      
      if (durationMs < 0) return null
      
      const durationSeconds = Math.floor(durationMs / 1000)
      
      if (durationSeconds < 60) {
        return `${durationSeconds}s`
      } else if (durationSeconds < 3600) {
        const minutes = Math.floor(durationSeconds / 60)
        const seconds = durationSeconds % 60
        return `${minutes}m ${seconds}s`
      } else {
        const hours = Math.floor(durationSeconds / 3600)
        const minutes = Math.floor((durationSeconds % 3600) / 60)
        const seconds = durationSeconds % 60
        return `${hours}h ${minutes}m ${seconds}s`
      }
    }
    
    return {
      activeTab,
      evaluation,
      results,
      filteredResults,
      allFilteredResults,
      stats,
      resultsPagination,
      filteredPagination,
      currentFilterPage,
      isLoading,
      localLoading,
      activeLLMCalls,
      maxConcurrentCalls,
      showCorrect,
      showIncorrect,
      showErrors,
      isStarting,
      isPausing,
      isResuming,
      isRetryingErrors,
      formatDate,
      getStatusBadgeClass,
      getStatusText,
      getProgressPercentage,
      getLLMCallsPercentage,
      refreshEvaluation,
      goToFirstResultsPage,
      goToPreviousResultsPage,
      goToNextResultsPage,
      goToLastResultsPage,
      handleBackdropClick,
      handleStart,
      handlePause,
      handleResume,
      handleRetryErrors,
      evaluationsStore,
      loadEvaluationData,
      props,
      showHtmlPreviewModal,
      htmlPreviewContent,
      showHtmlPreview,
      closeHtmlPreview,
      getEvaluationDuration
    }
  }
}
</script>