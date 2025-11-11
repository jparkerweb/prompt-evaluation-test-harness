<template>
  <div class="bg-white dark:bg-gray-800 shadow sm:rounded-lg mb-6">
    <div class="px-4 py-5 sm:p-6">
      <div class="space-y-4">
        <!-- Sort Controls and Clear Button Row -->
        <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between space-y-4 lg:space-y-0">
          <!-- Sort Controls -->
          <div class="flex flex-col sm:flex-row sm:items-end space-y-4 sm:space-y-0 sm:space-x-4">
            <!-- Sort By -->
            <div class="min-w-0 flex-1 sm:max-w-xs">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort by
              </label>
              <select 
                :value="modelValue.sortBy" 
                @change="updateFilter('sortBy', $event.target.value)"
                class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>

            <!-- Sort Direction -->
            <div class="min-w-0 flex-1 sm:max-w-[140px]">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Order
              </label>
              <select 
                :value="modelValue.sortDirection" 
                @change="updateFilter('sortDirection', $event.target.value)"
                class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="desc">{{ getSortDirectionLabel('desc') }}</option>
                <option value="asc">{{ getSortDirectionLabel('asc') }}</option>
              </select>
            </div>
          </div>

          <!-- Clear Filters Button -->
          <div class="flex justify-end">
            <button
              @click="clearFilters"
              v-if="hasActiveFilters"
              class="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <svg class="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filters
            </button>
          </div>
        </div>

        <!-- Filters Section -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" v-if="filters.length > 0">
          <!-- Custom Filters -->
          <div v-for="filter in filters" :key="filter.key">
            <!-- Select/Multi-select Filter -->
            <div v-if="filter.type === 'select'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ filter.label }}
              </label>
              <select 
                :value="modelValue[filter.key]" 
                @change="updateFilter(filter.key, $event.target.value)"
                class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All {{ filter.label }}</option>
                <option v-for="option in (filter.options?.value || filter.options || [])" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>

            <!-- Range Filter -->
            <div v-else-if="filter.type === 'range'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ filter.label }}
              </label>
              <div class="flex items-center space-x-2">
                <input
                  type="number"
                  :value="modelValue[filter.key + '_min']"
                  @input="updateFilter(filter.key + '_min', $event.target.value)"
                  :placeholder="filter.min?.toString()"
                  :min="filter.min"
                  :max="filter.max"
                  class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <span class="text-gray-500 dark:text-gray-400">to</span>
                <input
                  type="number"
                  :value="modelValue[filter.key + '_max']"
                  @input="updateFilter(filter.key + '_max', $event.target.value)"
                  :placeholder="filter.max?.toString()"
                  :min="filter.min"
                  :max="filter.max"
                  class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <!-- Date Range Filter -->
            <div v-else-if="filter.type === 'dateRange'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ filter.label }}
              </label>
              <div class="flex items-center space-x-2">
                <input
                  type="date"
                  :value="modelValue[filter.key + '_from']"
                  @input="updateFilter(filter.key + '_from', $event.target.value)"
                  class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <span class="text-gray-500 dark:text-gray-400">to</span>
                <input
                  type="date"
                  :value="modelValue[filter.key + '_to']"
                  @input="updateFilter(filter.key + '_to', $event.target.value)"
                  class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'FilterSortControls',
  props: {
    modelValue: {
      type: Object,
      required: true
    },
    sortOptions: {
      type: Array,
      required: true
    },
    filters: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const hasActiveFilters = computed(() => {
      const { sortBy, sortDirection, ...filters } = props.modelValue
      return Object.values(filters).some(value => value !== '' && value !== null && value !== undefined)
    })

    const updateFilter = (key, value) => {
      emit('update:modelValue', {
        ...props.modelValue,
        [key]: value
      })
    }

    const clearFilters = () => {
      const clearedFilters = {
        sortBy: props.modelValue.sortBy,
        sortDirection: props.modelValue.sortDirection
      }
      
      // Clear all filter values but keep the keys
      props.filters.forEach(filter => {
        if (filter.type === 'range') {
          clearedFilters[filter.key + '_min'] = ''
          clearedFilters[filter.key + '_max'] = ''
        } else if (filter.type === 'dateRange') {
          clearedFilters[filter.key + '_from'] = ''
          clearedFilters[filter.key + '_to'] = ''
        } else {
          clearedFilters[filter.key] = ''
        }
      })
      
      emit('update:modelValue', clearedFilters)
    }

    const getSortDirectionLabel = (direction) => {
      const sortBy = props.modelValue.sortBy
      const currentSort = props.sortOptions.find(opt => opt.value === sortBy)
      
      if (currentSort && currentSort.labels) {
        return direction === 'desc' ? currentSort.labels.desc : currentSort.labels.asc
      }
      
      return direction === 'desc' ? 'Descending' : 'Ascending'
    }

    return {
      hasActiveFilters,
      updateFilter,
      clearFilters,
      getSortDirectionLabel
    }
  }
}
</script>