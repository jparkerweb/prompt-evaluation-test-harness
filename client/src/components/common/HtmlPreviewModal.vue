<template>
  <div
    class="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-[60]"
    @click="handleBackdropClick"
  >
    <div 
      class="relative w-full max-w-4xl mx-4 h-[80vh] flex flex-col bg-white dark:bg-gray-800 rounded-md shadow-lg"
      @click.stop
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            HTML Preview
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Rendered HTML content
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
      
      <!-- Scrollable HTML Content -->
      <div class="flex-1 overflow-auto p-6">
        <div 
          class="html-content-preview bg-white dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700"
          v-html="htmlContent"
        >
        </div>
      </div>
      
      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div class="flex justify-end">
          <button
            @click="$emit('close')"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HtmlPreviewModal',
  props: {
    htmlContent: {
      type: String,
      required: true,
      default: ''
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const handleBackdropClick = (event) => {
      // Prevent event from bubbling up to parent modals
      event.stopPropagation()
      
      if (event.target === event.currentTarget) {
        emit('close')
      }
    }
    
    return {
      handleBackdropClick
    }
  }
}
</script>

<style>
.html-content-preview {
  /* Reset and restore default HTML styling */
  background: white !important;
}

.html-content-preview h1 {
  font-size: 2em;
  font-weight: bold;
  margin: 0.67em 0;
}

.html-content-preview h2 {
  font-size: 1.5em;
  font-weight: bold;
  margin: 0.75em 0;
}

.html-content-preview h3 {
  font-size: 1.17em;
  font-weight: bold;
  margin: 1em 0;
}

.html-content-preview h4 {
  font-size: 1em;
  font-weight: bold;
  margin: 1.12em 0;
}

.html-content-preview h5 {
  font-size: 0.83em;
  font-weight: bold;
  margin: 1.5em 0;
}

.html-content-preview h6 {
  font-size: 0.75em;
  font-weight: bold;
  margin: 1.67em 0;
}

.html-content-preview p {
  margin: 1em 0;
}

.html-content-preview ul {
  list-style-type: disc;
  margin: 1em 0;
  padding-left: 40px;
}

.html-content-preview ol {
  list-style-type: decimal;
  margin: 1em 0;
  padding-left: 40px;
}

.html-content-preview li {
  display: list-item;
  margin: 0.5em 0;
}

.html-content-preview ul ul {
  list-style-type: circle;
}

.html-content-preview ul ul ul {
  list-style-type: square;
}

.html-content-preview ol ol {
  list-style-type: lower-alpha;
}

.html-content-preview ol ol ol {
  list-style-type: lower-roman;
}

.html-content-preview strong,
.html-content-preview b {
  font-weight: bold;
}

.html-content-preview em,
.html-content-preview i {
  font-style: italic;
}

.html-content-preview u {
  text-decoration: underline;
}

.html-content-preview s,
.html-content-preview strike {
  text-decoration: line-through;
}

.html-content-preview blockquote {
  margin: 1em 40px;
  padding-left: 1em;
  border-left: 4px solid #ccc;
}

.html-content-preview pre {
  font-family: monospace;
  white-space: pre;
  margin: 1em 0;
  padding: 1em;
  background-color: #f5f5f5;
  border: 1px solid #ccc;
  overflow-x: auto;
}

.html-content-preview code {
  font-family: monospace;
  background-color: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
}

.html-content-preview pre code {
  background-color: transparent;
  padding: 0;
}

.html-content-preview table {
  border-collapse: collapse;
  margin: 1em 0;
}

.html-content-preview th,
.html-content-preview td {
  border: 1px solid #ccc;
  padding: 0.5em;
  text-align: left;
}

.html-content-preview th {
  font-weight: bold;
  background-color: #f5f5f5;
}

.html-content-preview a {
  color: #0066cc;
  text-decoration: underline;
}

.html-content-preview a:visited {
  color: #800080;
}

.html-content-preview hr {
  border: none;
  border-top: 1px solid #ccc;
  margin: 1em 0;
}

.html-content-preview dl {
  margin: 1em 0;
}

.html-content-preview dt {
  font-weight: bold;
  margin-top: 1em;
}

.html-content-preview dd {
  margin-left: 40px;
  margin-bottom: 1em;
}

/* Dark mode adjustments */
.dark .html-content-preview pre {
  background-color: #374151;
  border-color: #4b5563;
  color: #e5e7eb;
}

.dark .html-content-preview code {
  background-color: #374151;
  color: #e5e7eb;
}

.dark .html-content-preview th {
  background-color: #374151;
  color: #e5e7eb;
}

.dark .html-content-preview th,
.dark .html-content-preview td {
  border-color: #4b5563;
}

.dark .html-content-preview blockquote {
  border-left-color: #6b7280;
}

.dark .html-content-preview hr {
  border-top-color: #4b5563;
}

.dark .html-content-preview a {
  color: #60a5fa;
}

.dark .html-content-preview a:visited {
  color: #c084fc;
}
</style>