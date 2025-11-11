<template>
  <div class="bg-white shadow overflow-hidden sm:rounded-md">
    <div class="px-4 py-5 sm:px-6 border-b border-gray-200">
      <div class="flex justify-between items-center">
        <div>
          <h3 class="text-lg leading-6 font-medium text-gray-900">
            Dataset Messages
          </h3>
          <p class="mt-1 max-w-2xl text-sm text-gray-500">
            {{ pagination.total }} messages in this dataset
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
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading && messages.length === 0" class="p-8 text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
      <p class="mt-2 text-sm text-gray-500">Loading messages...</p>
    </div>
    
    <!-- Messages List -->
    <div v-else class="max-h-96 overflow-y-auto">
      <ul class="divide-y divide-gray-200">
        <li v-for="(message, index) in messages" :key="message.id" class="px-4 py-4">
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0">
              <span class="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 text-gray-500 text-sm font-medium">
                {{ ((pagination.page - 1) * pagination.pageSize) + index + 1 }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-900 break-words">
                {{ message.messageContent }}
              </p>
              <div class="mt-1 flex items-center space-x-2">
                <span 
                  :class="[
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                    message.label 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  ]"
                >
                  {{ message.label ? 'True' : 'False' }}
                </span>
                <span class="text-xs text-gray-500">
                  ID: {{ message.id }}
                </span>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
    
    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
      <div class="flex items-center justify-between">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="goToPreviousPage"
            :disabled="pagination.page <= 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            @click="goToNextPage"
            :disabled="pagination.page >= pagination.totalPages"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              Showing {{ ((pagination.page - 1) * pagination.pageSize) + 1 }} to 
              {{ Math.min(pagination.page * pagination.pageSize, pagination.total) }} of 
              {{ pagination.total }} messages
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                @click="goToPreviousPage"
                :disabled="pagination.page <= 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                @click="goToNextPage"
                :disabled="pagination.page >= pagination.totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useDatasetsStore } from '@/stores/datasets'

export default {
  name: 'MessageList',
  props: {
    datasetId: {
      type: Number,
      required: true
    }
  },
  emits: ['close'],
  setup(props) {
    const datasetsStore = useDatasetsStore()
    
    const messages = computed(() => datasetsStore.currentMessages)
    const pagination = computed(() => datasetsStore.messagesPagination)
    const isLoading = computed(() => datasetsStore.isLoading)
    
    const goToPreviousPage = () => {
      if (pagination.value.page > 1) {
        datasetsStore.fetchDatasetMessages(
          props.datasetId, 
          pagination.value.page - 1, 
          pagination.value.pageSize
        )
      }
    }
    
    const goToNextPage = () => {
      if (pagination.value.page < pagination.value.totalPages) {
        datasetsStore.fetchDatasetMessages(
          props.datasetId, 
          pagination.value.page + 1, 
          pagination.value.pageSize
        )
      }
    }
    
    return {
      messages,
      pagination,
      isLoading,
      goToPreviousPage,
      goToNextPage
    }
  }
}
</script>