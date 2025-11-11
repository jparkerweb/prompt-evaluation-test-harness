import { ref, watch } from 'vue'

export const useSortPreferences = (storageKey, defaultSortBy = 'created_at', defaultSortDirection = 'desc') => {
  const STORAGE_PREFIX = 'prompt-eval-sort-prefs'
  const FULL_KEY = `${STORAGE_PREFIX}-${storageKey}`
  
  const loadPreferences = () => {
    try {
      const stored = localStorage.getItem(FULL_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          sortBy: parsed.sortBy || defaultSortBy,
          sortDirection: parsed.sortDirection || defaultSortDirection
        }
      }
    } catch (error) {
      console.error(`Failed to load sort preferences for ${storageKey}:`, error)
    }
    
    return {
      sortBy: defaultSortBy,
      sortDirection: defaultSortDirection
    }
  }
  
  const savePreferences = (sortBy, sortDirection) => {
    try {
      localStorage.setItem(FULL_KEY, JSON.stringify({
        sortBy,
        sortDirection
      }))
    } catch (error) {
      console.error(`Failed to save sort preferences for ${storageKey}:`, error)
    }
  }
  
  const preferences = ref(loadPreferences())
  
  watch(
    () => ({ sortBy: preferences.value.sortBy, sortDirection: preferences.value.sortDirection }),
    (newPrefs) => {
      savePreferences(newPrefs.sortBy, newPrefs.sortDirection)
    },
    { deep: true }
  )
  
  const initializeFilters = (filters) => {
    return {
      ...filters,
      sortBy: preferences.value.sortBy,
      sortDirection: preferences.value.sortDirection
    }
  }
  
  const updateSortPreferences = (sortBy, sortDirection) => {
    preferences.value.sortBy = sortBy
    preferences.value.sortDirection = sortDirection
  }
  
  return {
    preferences,
    initializeFilters,
    updateSortPreferences
  }
}