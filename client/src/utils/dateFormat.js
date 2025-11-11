/**
 * Format a date string using the browser's local timezone
 * @param {string} dateString - ISO date string from the server
 * @returns {string} Formatted date string
 */
export function formatDate(dateString) {
  if (!dateString) return ''
  
  // SQLite CURRENT_TIMESTAMP returns UTC without 'Z' suffix
  // If the string doesn't end with 'Z' and looks like a UTC timestamp, add 'Z'
  let isoString = dateString
  if (dateString.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
    // SQLite format: "2024-01-15 14:30:45" -> convert to ISO format
    isoString = dateString.replace(' ', 'T') + 'Z'
  } else if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/) && !dateString.endsWith('Z')) {
    // ISO format without timezone -> assume UTC
    isoString = dateString + 'Z'
  }
  
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format a date string for relative time (e.g., "2 hours ago")
 * @param {string} dateString - ISO date string from the server
 * @returns {string} Relative time string
 */
export function formatRelativeDate(dateString) {
  if (!dateString) return ''
  
  // Handle SQLite UTC timestamps same as formatDate
  let isoString = dateString
  if (dateString.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
    isoString = dateString.replace(' ', 'T') + 'Z'
  } else if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/) && !dateString.endsWith('Z')) {
    isoString = dateString + 'Z'
  }
  
  const date = new Date(isoString)
  const now = new Date()
  const diffInMs = now - date
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)
  
  if (diffInMinutes < 1) {
    return 'Just now'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
  } else {
    return formatDate(dateString)
  }
}