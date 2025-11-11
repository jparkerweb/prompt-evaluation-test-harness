import { ref, watch } from 'vue'

const isDark = ref(false)

// Check for saved theme preference or default to light mode
const savedTheme = localStorage.getItem('theme')
if (savedTheme) {
  isDark.value = savedTheme === 'dark'
} else {
  // Check system preference
  isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Apply theme immediately
if (isDark.value) {
  document.documentElement.classList.add('dark')
} else {
  document.documentElement.classList.remove('dark')
}

// Watch for theme changes
watch(isDark, (newValue) => {
  if (newValue) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
})

export function useTheme() {
  const toggleTheme = () => {
    isDark.value = !isDark.value
  }

  return {
    isDark,
    toggleTheme
  }
}