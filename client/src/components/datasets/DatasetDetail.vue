<template>
  <div
    class="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50"
    @click="handleBackdropClick"
  >
    <div 
      class="relative w-full max-w-6xl mx-4 h-[90vh] flex flex-col bg-white dark:bg-gray-800 rounded-md shadow-lg"
      @click.stop
    >
      <!-- Fixed Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            {{ dataset?.name || 'Dataset Details' }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Dataset ID: {{ dataset?.id }} • 
            Created by <span class="text-sm text-blue-600 dark:text-blue-400 truncate">{{ dataset?.created_by_username }}</span> • 
            {{ currentMessageCount }} messages
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
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading dataset messages...</p>
        </div>
        
        <!-- Dataset Content -->
        <div v-else-if="messages && messages.length > 0" class="space-y-6">
          <!-- Dataset Information -->
          <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Dataset Information</h4>
            <dl class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div>
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Messages</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ pagination?.total || 0 }}</dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Upload Date</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ formatDate(dataset?.created_at) }}</dd>
              </div>
            </dl>
          </div>

          <!-- Messages List -->
          <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white">Dataset Messages</h4>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                Showing {{ ((pagination?.page - 1) * pagination?.pageSize) + 1 }} to 
                {{ Math.min(pagination?.page * pagination?.pageSize, pagination?.total) }} of 
                {{ pagination?.total }} messages
              </div>
            </div>
            
            <div class="space-y-4">
              <div 
                v-for="(message, index) in messages" 
                :key="message.id"
                class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
              >
                <div class="flex items-start justify-between mb-2">
                  <div class="flex items-center space-x-2">
                    <div v-if="!dataset?.is_referenced_in_evaluations && !editingMessages[message.id]" class="flex items-center space-x-1">
                      <button
                        v-if="dataset.created_by === currentUserId"
                        @click="startEditing(message)"
                        class="p-1 text-gray-400 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md"
                        title="Edit message"
                      >
                        <PencilIcon class="h-4 w-4" />
                      </button>
                      <button
                        v-if="dataset.created_by === currentUserId"
                        @click="confirmDeleteMessage(message)"
                        class="p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md"
                        title="Delete message"
                      >
                        <TrashIcon class="h-4 w-4" />
                      </button>
                    </div>
                    <span class="text-sm font-medium text-gray-900 dark:text-white">
                      Message {{ ((pagination?.page - 1) * pagination?.pageSize) + index + 1 }}
                    </span>
                    <div v-if="!editingMessages[message.id]">
                      <span 
                        :class="[
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          message.label 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                        ]"
                      >
                        {{ message.label ? 'True' : 'False' }}
                      </span>
                    </div>
                    <div v-else class="flex items-center space-x-2">
                      <button
                        @click="toggleEditLabel(message.id)"
                        :class="[
                          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                          editForms[message.id].label ? 'bg-green-600' : 'bg-gray-200'
                        ]"
                      >
                        <span
                          :class="[
                            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                            editForms[message.id].label ? 'translate-x-5' : 'translate-x-0'
                          ]"
                        />
                      </button>
                      <span 
                        :class="[
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          editForms[message.id].label 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                        ]"
                      >
                        {{ editForms[message.id].label ? 'True' : 'False' }}
                      </span>
                    </div>
                  </div>
                  <span class="text-xs text-gray-500 dark:text-gray-400">ID: {{ message.id }}</span>
                </div>
                
                <div class="mt-2">
                  <div class="flex items-center justify-between mb-1">
                    <h5 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Content</h5>
                    <button
                      v-if="!editingMessages[message.id]"
                      @click="showHtmlPreview(message.messageContent)"
                      class="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/75 transition-colors"
                    >
                      HTML VIEW
                    </button>
                  </div>
                  <div v-if="!editingMessages[message.id]" class="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-2 rounded border border-gray-300 dark:border-gray-600">
                    {{ message.messageContent }}
                  </div>
                  <div v-else>
                    <textarea
                      v-model="editForms[message.id].messageContent"
                      class="w-full break-words text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-2 rounded border border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
                      rows="3"
                      placeholder="Enter message content..."
                    />
                    <div class="mt-2 flex justify-end space-x-2">
                      <button
                        @click="cancelEditing(message.id)"
                        class="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Cancel
                      </button>
                      <button
                        @click="updateMessage(message.id)"
                        :disabled="isSaving[message.id] || !editForms[message.id].messageContent.trim()"
                        class="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {{ isSaving[message.id] ? 'Updating...' : 'Update' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- New Message Form (shown on last page or when no messages) -->
            <div 
              v-if="showNewMessageForm && (!pagination || pagination.totalPages === 0 || pagination.page === pagination.totalPages)"
              class="mt-4 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-lg p-4 bg-indigo-50 dark:bg-indigo-900/20"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center space-x-2">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    New Message
                  </span>
                  <div class="flex items-center space-x-2">
                    <button
                      @click="toggleNewMessageLabel"
                      :class="[
                        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                        newMessageForm.label ? 'bg-green-600' : 'bg-gray-200'
                      ]"
                    >
                      <span
                        :class="[
                          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                          newMessageForm.label ? 'translate-x-5' : 'translate-x-0'
                        ]"
                      />
                    </button>
                    <span 
                      :class="[
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        newMessageForm.label 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                      ]"
                    >
                      {{ newMessageForm.label ? 'True' : 'False' }}
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="mt-2">
                <div class="flex items-center justify-between mb-1">
                  <h5 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Content</h5>
                  <button
                    v-if="newMessageForm.messageContent.trim()"
                    @click="showHtmlPreview(newMessageForm.messageContent)"
                    class="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/75 transition-colors"
                  >
                    HTML VIEW
                  </button>
                </div>
                <textarea
                  v-model="newMessageForm.messageContent"
                  ref="newMessageTextarea"
                  class="w-full break-words text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
                  rows="3"
                  placeholder="Enter message content..."
                />
                <div class="mt-2 flex justify-end space-x-2">
                  <button
                    @click="cancelNewMessage"
                    class="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    @click="createMessage"
                    :disabled="isCreatingMessage || !newMessageForm.messageContent.trim()"
                    class="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ isCreatingMessage ? 'Creating...' : 'Add Message' }}
                  </button>
                </div>
              </div>
            </div>
            
          </div>
        </div>
        
        <!-- Empty State -->
        <div v-else>
          <div class="text-center py-8">
            <p class="text-gray-500 dark:text-gray-400">No messages found for this dataset.</p>
          </div>
          
          <!-- New Message Form for empty datasets -->
          <div 
            v-if="showNewMessageForm"
            class="mt-4 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-lg p-4 bg-indigo-50 dark:bg-indigo-900/20"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center space-x-2">
                <span class="text-sm font-medium text-gray-900 dark:text-white">
                  New Message
                </span>
                <div class="flex items-center space-x-2">
                  <button
                    @click="toggleNewMessageLabel"
                    :class="[
                      'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                      newMessageForm.label ? 'bg-green-600' : 'bg-gray-200'
                    ]"
                  >
                    <span
                      :class="[
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                        newMessageForm.label ? 'translate-x-5' : 'translate-x-0'
                      ]"
                    />
                  </button>
                  <span 
                    :class="[
                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                      newMessageForm.label 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                    ]"
                  >
                    {{ newMessageForm.label ? 'True' : 'False' }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="mt-2">
              <div class="flex items-center justify-between mb-1">
                <h5 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Content</h5>
                <button
                  v-if="newMessageForm.messageContent.trim()"
                  @click="showHtmlPreview(newMessageForm.messageContent)"
                  class="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/75 transition-colors"
                >
                  HTML VIEW
                </button>
              </div>
              <textarea
                v-model="newMessageForm.messageContent"
                ref="newMessageTextarea"
                class="w-full break-words text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
                rows="3"
                placeholder="Enter message content..."
              />
              <div class="mt-2 flex justify-end space-x-2">
                <button
                  @click="cancelNewMessage"
                  class="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  @click="createMessage"
                  :disabled="isCreatingMessage || !newMessageForm.messageContent.trim()"
                  class="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ isCreatingMessage ? 'Creating...' : 'Add Message' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Fixed Footer Actions -->
      <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <!-- Pagination -->
          <div v-if="pagination && pagination.totalPages > 1">
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                @click="goToFirstPage"
                :disabled="pagination.page <= 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                @click="goToPreviousPage"
                :disabled="pagination.page <= 1"
                class="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ pagination.page }} / {{ pagination.totalPages }}
              </span>
              <button
                @click="goToNextPage"
                :disabled="pagination.page >= pagination.totalPages"
                class="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                @click="goToLastPage"
                :disabled="pagination.page >= pagination.totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
              v-if="!dataset?.is_referenced_in_evaluations && !showNewMessageForm && dataset.created_by === currentUserId"
              @click="startAddingMessage"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Message
            </button>
            <button
              v-if="!dataset?.is_referenced_in_evaluations && dataset.created_by === currentUserId"
              @click.stop="triggerFileInput"
              :disabled="isUploading || isLoading"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isUploading ? 'Uploading...' : 'Upload JSONL' }}
            </button>
            <button
              @click="downloadJSONL"
              :disabled="isDownloading || isLoading || currentMessageCount === 0"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isDownloading ? 'Downloading...' : 'Download JSONL' }}
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
      
      <!-- Hidden File Input for JSONL Upload (inside modal to prevent event propagation issues) -->
      <input
        ref="fileInput"
        type="file"
        accept=".jsonl,.json"
        class="hidden"
        @change="handleFileUpload"
      />
    </div>
    
    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 dark:border-gray-700">
        <div class="mt-3 text-center">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">Delete Message</h3>
          <div class="mt-2 px-7 py-3">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
          </div>
          <div class="flex justify-center space-x-3 px-4 py-3">
            <button
              @click="cancelDelete"
              class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Cancel
            </button>
            <button
              ref="deleteButtonRef"
              @click="deleteMessage"
              :disabled="isDeleting"
              class="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              {{ isDeleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
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
import { ref, computed, watch, reactive, nextTick, onMounted } from 'vue'
import { useDatasetsStore } from '@/stores/datasets'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/utils/dateFormat'
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import HtmlPreviewModal from '@/components/common/HtmlPreviewModal.vue'
import DOMPurify from 'dompurify'

export default {
  name: 'DatasetDetail',
  components: {
    PencilIcon,
    TrashIcon,
    HtmlPreviewModal
  },
  props: {
    dataset: {
      type: Object,
      required: true
    }
  },
  emits: ['close', 'deleting-message'],
  setup(props, { emit }) {
    const datasetsStore = useDatasetsStore()
    const authStore = useAuthStore()
    
    const messages = computed(() => datasetsStore.currentMessages)
    const pagination = computed(() => datasetsStore.messagesPagination)
    const isLoading = computed(() => datasetsStore.isLoading)
    
    // Use the dataset count from the store if available, otherwise fall back to prop
    const currentMessageCount = computed(() => {
      const storeDataset = datasetsStore.currentDataset
      if (storeDataset && storeDataset.id === props.dataset?.id) {
        return storeDataset.message_count
      }
      return props.dataset?.message_count || 0
    })
    
    const currentUserId = computed(() => authStore.user?.id)
    
    // Edit state management
    const editingMessages = reactive({})
    const editForms = reactive({})
    const isSaving = reactive({})
    
    // New message state
    const showNewMessageForm = ref(false)
    const isCreatingMessage = ref(false)
    const newMessageForm = reactive({
      label: false,
      messageContent: ''
    })
    const newMessageTextarea = ref(null)
    
    // Delete message state
    const showDeleteModal = ref(false)
    const messageToDelete = ref(null)
    const isDeleting = ref(false)
    
    // Download state
    const isDownloading = ref(false)
    
    // Upload state
    const isUploading = ref(false)
    const fileInput = ref(null)
    
    // Delete modal ref
    const deleteButtonRef = ref(null)
    
    // HTML Preview modal state
    const showHtmlPreviewModal = ref(false)
    const htmlPreviewContent = ref('')
    
    const goToFirstPage = () => {
      if (pagination.value && pagination.value.page > 1) {
        datasetsStore.fetchDatasetMessages(
          props.dataset.id, 
          1, 
          pagination.value.pageSize
        )
      }
    }
    
    const goToPreviousPage = () => {
      if (pagination.value && pagination.value.page > 1) {
        datasetsStore.fetchDatasetMessages(
          props.dataset.id, 
          pagination.value.page - 1, 
          pagination.value.pageSize
        )
      }
    }
    
    const goToNextPage = () => {
      if (pagination.value && pagination.value.page < pagination.value.totalPages) {
        datasetsStore.fetchDatasetMessages(
          props.dataset.id, 
          pagination.value.page + 1, 
          pagination.value.pageSize
        )
      }
    }
    
    const goToLastPage = () => {
      if (pagination.value && pagination.value.page < pagination.value.totalPages) {
        datasetsStore.fetchDatasetMessages(
          props.dataset.id, 
          pagination.value.totalPages, 
          pagination.value.pageSize
        )
      }
    }
    
    const loadDatasetMessages = async () => {
      if (props.dataset?.id) {
        try {
          // Set the current dataset in the store so counts are reactive
          datasetsStore.currentDataset = { ...props.dataset }
          
          await datasetsStore.fetchDatasetMessages(props.dataset.id)
        } catch (error) {
          console.error('Failed to load dataset messages:', error)
        }
      }
    }
    
    // Load messages when component mounts or dataset changes
    watch(() => props.dataset?.id, loadDatasetMessages, { immediate: true })
    
    const handleBackdropClick = (event) => {
      // Only close if clicking directly on the backdrop, not on child elements
      if (event.target === event.currentTarget) {
        emit('close')
      }
    }
    
    const startEditing = (message) => {
      editingMessages[message.id] = true
      editForms[message.id] = {
        label: message.label,
        messageContent: message.messageContent
      }
    }
    
    const cancelEditing = (messageId) => {
      delete editingMessages[messageId]
      delete editForms[messageId]
      delete isSaving[messageId]
    }
    
    const toggleEditLabel = (messageId) => {
      if (editForms[messageId]) {
        editForms[messageId].label = !editForms[messageId].label
      }
    }
    
    const updateMessage = async (messageId) => {
      if (!editForms[messageId] || !editForms[messageId].messageContent.trim()) {
        return
      }
      
      isSaving[messageId] = true
      
      try {
        await datasetsStore.updateDatasetMessage(
          props.dataset.id,
          messageId,
          editForms[messageId].label,
          editForms[messageId].messageContent
        )
        
        // Successfully updated, exit edit mode
        cancelEditing(messageId)
      } catch (error) {
        console.error('Failed to update message:', error)
        // Error handling is done in the store
      } finally {
        isSaving[messageId] = false
      }
    }
    
    const startAddingMessage = async () => {
      // Navigate to last page first (only if there are pages)
      if (pagination.value && pagination.value.totalPages > 0 && pagination.value.page < pagination.value.totalPages) {
        await datasetsStore.fetchDatasetMessages(
          props.dataset.id,
          pagination.value.totalPages,
          pagination.value.pageSize
        )
      }
      
      showNewMessageForm.value = true
      
      // Wait for form to render, then focus and scroll to it
      await nextTick()
      if (newMessageTextarea.value) {
        newMessageTextarea.value.focus()
        newMessageTextarea.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    
    const cancelNewMessage = () => {
      showNewMessageForm.value = false
      newMessageForm.label = false
      newMessageForm.messageContent = ''
    }
    
    const toggleNewMessageLabel = () => {
      newMessageForm.label = !newMessageForm.label
    }
    
    const createMessage = async () => {
      if (!newMessageForm.messageContent.trim()) {
        return
      }
      
      isCreatingMessage.value = true
      
      try {
        await datasetsStore.createDatasetMessage(
          props.dataset.id,
          newMessageForm.label,
          newMessageForm.messageContent
        )
        
        // Refresh the messages - for empty datasets, fetch page 1
        const pageToFetch = (!pagination.value || pagination.value.totalPages === 0) 
          ? 1 
          : pagination.value.totalPages
        const pageSizeToUse = pagination.value?.pageSize || 50
        
        await datasetsStore.fetchDatasetMessages(
          props.dataset.id,
          pageToFetch,
          pageSizeToUse
        )
        
        // Clear form and hide it
        cancelNewMessage()
      } catch (error) {
        console.error('Failed to create message:', error)
        // Error handling is done in the store
      } finally {
        isCreatingMessage.value = false
      }
    }
    
    const confirmDeleteMessage = (message) => {
      messageToDelete.value = message
      showDeleteModal.value = true
      
      // Focus delete button when modal opens
      nextTick(() => {
        if (deleteButtonRef.value) {
          deleteButtonRef.value.focus()
        }
      })
    }
    
    const cancelDelete = () => {
      showDeleteModal.value = false
      messageToDelete.value = null
    }
    
    const deleteMessage = async () => {
      if (!messageToDelete.value) return
      
      isDeleting.value = true
      emit('deleting-message', true) // Notify parent that deletion is starting
      
      try {
        await datasetsStore.deleteDatasetMessage(
          props.dataset.id,
          messageToDelete.value.id
        )
        
        // Check if we need to navigate to previous page if current page is now empty
        const messagesOnCurrentPage = messages.value.length
        if (messagesOnCurrentPage === 0 && pagination.value.page > 1) {
          // Navigate to previous page since current page is now empty
          await datasetsStore.fetchDatasetMessages(
            props.dataset.id,
            pagination.value.page - 1,
            pagination.value.pageSize
          )
        } else {
          // Refresh current page to ensure UI is in sync
          await datasetsStore.fetchDatasetMessages(
            props.dataset.id,
            pagination.value.page,
            pagination.value.pageSize
          )
        }
        
        cancelDelete()
        // Note: Modal should remain open after successful deletion
      } catch (error) {
        console.error('Failed to delete message:', error)
        // Error handling is done in the store
      } finally {
        isDeleting.value = false
        emit('deleting-message', false) // Notify parent that deletion is finished
      }
    }
    
    const sanitizeFilename = (name) => {
      // Keep only alphanumeric, spaces, dashes, and parentheses - replace everything else with underscore
      return name.replace(/[^a-zA-Z0-9\s\-()]/g, '_')
    }
    
    const downloadJSONL = async () => {
      if (!props.dataset?.id || isDownloading.value) return
      
      isDownloading.value = true
      
      try {
        const allMessages = []
        const totalPages = pagination.value?.totalPages || 1
        const pageSize = pagination.value?.pageSize || 50
        
        // Store the current page to restore later
        const originalPage = pagination.value?.page || 1
        
        // Fetch all pages of messages
        for (let page = 1; page <= totalPages; page++) {
          await datasetsStore.fetchDatasetMessages(
            props.dataset.id,
            page,
            pageSize
          )
          // Collect messages from current page
          allMessages.push(...datasetsStore.currentMessages)
        }
        
        // If we don't have pagination info or no pages, try to get all messages with a large page size
        if (totalPages === 0 || allMessages.length === 0) {
          await datasetsStore.fetchDatasetMessages(props.dataset.id, 1, 10000) // Large page size to get all
          allMessages.push(...datasetsStore.currentMessages)
        }
        
        // Convert messages to JSONL format (one JSON object per line)
        const jsonlContent = allMessages.map(message => 
          JSON.stringify({
            label: Boolean(message.label),
            messageContent: message.messageContent
          })
        ).join('\n')
        
        // Create and download the file
        const sanitizedName = sanitizeFilename(props.dataset.name || 'dataset')
        const filename = `${sanitizedName}.jsonl`
        
        const blob = new Blob([jsonlContent], { type: 'application/jsonl' })
        const url = URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Clean up the object URL
        URL.revokeObjectURL(url)
        
        // Restore the original view by reloading the original page
        await datasetsStore.fetchDatasetMessages(
          props.dataset.id,
          originalPage,
          pageSize
        )
        
      } catch (error) {
        console.error('Failed to download JSONL:', error)
        // Error handling could be improved here with user notification
      } finally {
        isDownloading.value = false
      }
    }
    
    const triggerFileInput = (event) => {
      // Prevent any event propagation
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
      
      // Use nextTick to ensure DOM is ready
      nextTick(() => {
        if (fileInput.value) {
          fileInput.value.click()
        }
      })
    }
    
    const handleFileUpload = async (event) => {
      const file = event.target.files[0]
      if (!file || !props.dataset?.id) return
      
      isUploading.value = true
      
      try {
        const result = await datasetsStore.uploadMessagesToDataset(props.dataset.id, file)
        
        // Refresh the dataset to get updated message count
        await datasetsStore.fetchDatasetById(props.dataset.id)
        
        // Refresh current messages to show newly added messages
        await datasetsStore.fetchDatasetMessages(
          props.dataset.id,
          pagination.value?.page || 1,
          pagination.value?.pageSize || 50
        )
        
        // Clear the file input
        if (fileInput.value) {
          fileInput.value.value = ''
        }
        
        // Optional: Show success message with number of messages added
        if (result?.addedMessages) {
          console.log(`Successfully added ${result.addedMessages} messages`)
        }
      } catch (error) {
        console.error('Failed to upload JSONL:', error)
        // Error handling is done in the store
      } finally {
        isUploading.value = false
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
    
    return {
      messages,
      pagination,
      isLoading,
      currentMessageCount,
      currentUserId,
      formatDate,
      goToFirstPage,
      goToPreviousPage,
      goToNextPage,
      goToLastPage,
      handleBackdropClick,
      editingMessages,
      editForms,
      isSaving,
      startEditing,
      cancelEditing,
      toggleEditLabel,
      updateMessage,
      showNewMessageForm,
      isCreatingMessage,
      newMessageForm,
      newMessageTextarea,
      startAddingMessage,
      cancelNewMessage,
      toggleNewMessageLabel,
      createMessage,
      showDeleteModal,
      messageToDelete,
      isDeleting,
      confirmDeleteMessage,
      cancelDelete,
      deleteMessage,
      isDownloading,
      downloadJSONL,
      sanitizeFilename,
      isUploading,
      fileInput,
      triggerFileInput,
      handleFileUpload,
      deleteButtonRef,
      showHtmlPreviewModal,
      htmlPreviewContent,
      showHtmlPreview,
      closeHtmlPreview
    }
  }
}
</script>