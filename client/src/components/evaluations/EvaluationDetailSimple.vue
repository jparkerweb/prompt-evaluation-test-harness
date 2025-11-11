<template>
  <div
    class="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
    @click="$emit('close')"
  >
    <div 
      class="relative w-full max-w-6xl mx-4 h-[90vh] flex flex-col bg-white dark:bg-gray-800 rounded-md shadow-lg"
      @click.stop
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-start">
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            {{ evaluation?.name || 'Loading...' }}
          </h3>
        </div>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        <div v-if="evaluation">
          <div class="p-4 bg-green-50 border border-green-200 rounded mb-4">
            <p class="text-sm text-green-800">✅ Evaluation loaded: {{ evaluation.name }} (ID: {{ evaluation.id }})</p>
          </div>
          <pre class="text-xs bg-gray-100 p-4 rounded">{{ JSON.stringify(evaluation, null, 2) }}</pre>
        </div>
        <div v-else class="p-8 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p class="mt-2 text-sm text-gray-500">Loading evaluation {{ evaluationId }}...</p>
          <button @click="loadData" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Retry</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted } from 'vue'
import { useEvaluationsStore } from '@/stores/evaluations'

export default {
  name: 'EvaluationDetailSimple',
  props: {
    evaluationId: {
      type: Number,
      required: true
    }
  },
  emits: ['close'],
  setup(props) {
    const evaluationsStore = useEvaluationsStore()
    const evaluation = ref(null)
    
    const loadData = async () => {
      console.log('🔄 Loading evaluation:', props.evaluationId)
      try {
        const result = await evaluationsStore.fetchEvaluationById(props.evaluationId)
        evaluation.value = result
        console.log('✅ Evaluation loaded:', evaluation.value)
      } catch (err) {
        console.error('❌ Failed to load:', err)
      }
    }
    
    onMounted(() => {
      loadData()
    })
    
    watch(() => props.evaluationId, () => {
      loadData()
    })
    
    return {
      evaluation,
      evaluationId: props.evaluationId,
      loadData
    }
  }
}
</script>