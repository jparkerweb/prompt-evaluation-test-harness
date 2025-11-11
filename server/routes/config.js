import express from 'express';
import bedrockService from '../services/bedrock.service.js';

const router = express.Router();

// Public configuration endpoint - no auth required
router.get('/', (req, res) => {
  // Only expose non-sensitive configuration values
  res.json({
    success: true,
    data: {
      maxConcurrentLLMRequests: parseInt(process.env.MAX_CONCURRENT_LLM_REQUESTS) || 5,
      llmRequestRetryAttempts: parseInt(process.env.LLM_REQUEST_RETRY_ATTEMPTS) || 3,
      llmRequestRetryDelayMs: parseInt(process.env.LLM_REQUEST_RETRY_DELAY_MS) || 500,
      maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB) || 50,
      defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE) || 50,
      maxPageSize: parseInt(process.env.MAX_PAGE_SIZE) || 100
    }
  });
});

// Get available models from bedrock-wrapper
router.get('/models', async (req, res) => {
  try {
    const models = await bedrockService.getAvailableModels();
    res.json({
      success: true,
      data: models
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available models'
    });
  }
});

export default router;