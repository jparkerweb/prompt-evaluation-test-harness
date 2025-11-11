// Utility helper functions

function parseBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower === 'true') return true
    if (lower === 'false') return false
  }
  return null
}

function paginate(page = 1, pageSize = 50) {
  const limit = Math.min(pageSize, process.env.MAX_PAGE_SIZE || 100)
  const offset = (page - 1) * limit
  return { limit, offset }
}

function formatErrorResponse(error) {
  return {
    error: {
      message: error.message || 'An error occurred',
      status: error.statusCode || 500
    }
  }
}

export {
  parseBoolean,
  paginate,
  formatErrorResponse
}