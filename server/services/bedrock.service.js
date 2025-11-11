import { bedrockWrapper, listBedrockWrapperSupportedModels } from 'bedrock-wrapper';
import logger from '../utils/logger.js';

class BedrockService {
  constructor() {
    // Initialize the Bedrock wrapper
    // Uses AWS credentials from environment variables or IAM role
    this.bedrock = bedrockWrapper;
    this.region = process.env.AWS_REGION || 'us-west-2';
    
    // Cache for model mappings
    this.modelMappingCache = new Map();
    
    // Log supported models for debugging
    this.logSupportedModels();
  }
  
  async logSupportedModels() {
    try {
      const models = await listBedrockWrapperSupportedModels();
      logger.info('Bedrock-wrapper supported models:', models);
    } catch (error) {
      logger.error('Failed to list supported models:', error);
    }
  }

  /**
   * Get available models from bedrock-wrapper with proper display names and groupings
   * Also builds a cache of modelId to bedrockWrapperName mappings
   */
  async getAvailableModels() {
    try {
      const models = await listBedrockWrapperSupportedModels();
      logger.debug('Raw models from bedrock-wrapper:', models);
      
      // Process models and create organized structure
      const processedModels = [];
      
      // Handle the actual format returned by bedrock-wrapper
      const modelEntries = Object.values(models);
      
      modelEntries.forEach(modelEntry => {
        let modelData;
        
        // Parse the JSON string if needed
        if (typeof modelEntry === 'string') {
          try {
            modelData = JSON.parse(modelEntry);
          } catch (e) {
            console.warn('Failed to parse model entry:', modelEntry);
            return;
          }
        } else {
          modelData = modelEntry;
        }
        
        const modelName = modelData.modelName || modelData.name;
        const modelId = modelData.modelId || modelData.id;
        
        if (modelName && modelId) {
          // Skip "Thinking" models for now as they may have different usage patterns
          if (modelName.includes('Thinking')) {
            return;
          }
          
          // Create display name from model name
          let displayName = modelName.replace(/-/g, ' ');
          
          // Determine group and improve display name
          let group = 'Other';
          if (modelName.includes('Claude-4')) {
            group = 'Claude 4';
            displayName = displayName.replace('Claude 4 ', 'Claude 4 ');
          } else if (modelName.includes('Claude-3-7')) {
            group = 'Claude 3.7';
            displayName = displayName.replace('Claude 3 7', 'Claude 3.7');
          } else if (modelName.includes('Claude-3-5')) {
            group = 'Claude 3.5';
            displayName = displayName.replace('Claude 3 5', 'Claude 3.5');
          } else if (modelName.includes('Claude-3')) {
            group = 'Claude 3';
            displayName = displayName.replace('Claude 3 ', 'Claude 3 ');
          } else if (modelName.includes('Nova')) {
            group = 'Nova';
          } else if (modelName.includes('Llama-3-3')) {
            group = 'Llama 3.3';
            displayName = displayName.replace('Llama 3 3', 'Llama 3.3');
          } else if (modelName.includes('Llama-3-2')) {
            group = 'Llama 3.2';
            displayName = displayName.replace('Llama 3 2', 'Llama 3.2');
          } else if (modelName.includes('Llama-3-1')) {
            group = 'Llama 3.1';
            displayName = displayName.replace('Llama 3 1', 'Llama 3.1');
          } else if (modelName.includes('Llama-3')) {
            group = 'Llama 3';
            displayName = displayName.replace('Llama 3 ', 'Llama 3 ');
          } else if (modelName.includes('Mistral') || modelName.includes('Mixtral')) {
            group = 'Mistral';
          } else if (modelName.includes('GPT-OSS')) {
            group = 'GPT-OSS';
          }
          
          // Cache the mapping for later use
          this.modelMappingCache.set(modelId, modelName);
          
          processedModels.push({
            id: modelId,
            name: displayName,
            group: group,
            bedrockWrapperName: modelName
          });
        }
      });
      
      // Group models
      const groupedModels = processedModels.reduce((acc, model) => {
        if (!acc[model.group]) {
          acc[model.group] = [];
        }
        acc[model.group].push(model);
        return acc;
      }, {});
      
      // Sort groups and models within groups
      const sortedGroups = Object.keys(groupedModels).sort();
      const result = sortedGroups.map(group => ({
        group,
        models: groupedModels[group].sort((a, b) => a.name.localeCompare(b.name))
      }));
      
      logger.info(`Successfully processed ${processedModels.length} models into ${sortedGroups.length} groups`);
      return result;
      
    } catch (error) {
      logger.error('Failed to get available models from bedrock-wrapper:', error);
      
      // Return empty list - no fallback hardcoded models
      return [];
    }
  }


  /**
   * Get bedrock-wrapper modelName for a given AWS Bedrock model ID
   * Uses the cached mapping built during getAvailableModels()
   */
  async getBedrockWrapperModelName(awsModelId) {
    // If cache is empty, try to populate it
    if (this.modelMappingCache.size === 0) {
      logger.info('Model mapping cache is empty, fetching models...');
      await this.getAvailableModels();
    }
    
    // Get the mapping from cache
    const mappedName = this.modelMappingCache.get(awsModelId);
    
    if (!mappedName) {
      logger.warn(`Model ID ${awsModelId} not found in dynamic mappings, using original ID`);
      // Try to extract a reasonable name from the AWS model ID as fallback
      // This is just a best-effort fallback
      return awsModelId;
    }
    
    return mappedName;
  }

  /**
   * Invoke a model with the given prompt and parameters
   */
  async invokeModel(modelId, promptText, parameters = {}) {
    const startTime = Date.now();
    
    try {
      logger.info(`Invoking model ${modelId} with prompt length: ${promptText.length}`);
      logger.debug(`Raw parameters received:`, parameters);
      
      const {
        maxTokens = 4096,
        temperature = 0.7,
        topP = 0.9,
        stopSequences = []
      } = parameters;
      
      logger.debug(`Extracted stop sequences:`, {
        stopSequences,
        type: typeof stopSequences,
        isArray: Array.isArray(stopSequences),
        length: stopSequences ? (Array.isArray(stopSequences) ? stopSequences.length : 1) : 0
      });

      // Use bedrock-wrapper function (it's an async generator)
      const requestBody = {
        messages: [
          {
            role: 'user',
            content: promptText
          }
        ],
        max_tokens: maxTokens,
        temperature,
        top_p: topP
      };

      if (stopSequences.length > 0) {
        requestBody.stop_sequences = stopSequences;
      }

      // Get the bedrock-wrapper model name from the dynamic mapping
      const mappedModelId = await this.getBedrockWrapperModelName(modelId);
      logger.info(`Mapped model ID from ${modelId} to ${mappedModelId}`);
      
      // bedrockWrapper expects an OpenAI-compatible request object as the second parameter
      const openaiChatCompletionsCreateObject = {
        model: mappedModelId,  // Use the mapped model name
        messages: requestBody.messages,
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
        stream: true  // Enable streaming
      };

      // Handle stop sequences with proper safety checks
      // bedrock-wrapper 2.4.2 supports both 'stop' and 'stop_sequences' parameters
      if (stopSequences && Array.isArray(stopSequences) && stopSequences.length > 0) {
        // Use both formats for maximum compatibility
        openaiChatCompletionsCreateObject.stop = stopSequences;
        openaiChatCompletionsCreateObject.stop_sequences = stopSequences;
        logger.debug(`Added stop sequences to request:`, stopSequences);
      } else if (stopSequences && typeof stopSequences === 'string') {
        // Handle single string format
        openaiChatCompletionsCreateObject.stop = stopSequences;
        openaiChatCompletionsCreateObject.stop_sequences = [stopSequences];
        logger.debug(`Added single string stop sequence to request:`, stopSequences);
      } else {
        logger.debug(`No valid stop sequences to add:`, { stopSequences, type: typeof stopSequences });
      }

      // bedrockWrapper is an async generator function that expects awsCreds as first parameter
      const awsCreds = {
        region: this.region,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      };
      
      // Log the final request object being sent to bedrock-wrapper
      logger.debug(`Final request object for bedrock-wrapper:`, {
        model: openaiChatCompletionsCreateObject.model,
        max_tokens: openaiChatCompletionsCreateObject.max_tokens,
        temperature: openaiChatCompletionsCreateObject.temperature,
        top_p: openaiChatCompletionsCreateObject.top_p,
        stop: openaiChatCompletionsCreateObject.stop,
        stop_sequences: openaiChatCompletionsCreateObject.stop_sequences,
        stream: openaiChatCompletionsCreateObject.stream,
        messagesCount: openaiChatCompletionsCreateObject.messages.length
      });
      
      const generator = this.bedrock(awsCreds, openaiChatCompletionsCreateObject, { useConverseAPI: true }); // useConverseAPI: true (omit or set to false to use the invoke API)

      let fullResponse = '';
      try {
        // Add timeout protection for LLM calls (default 5 minutes)
        const timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS) || 300000; // 5 minutes
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('LLM call timed out')), timeoutMs);
        });

        // Create a promise that resolves when streaming completes
        const streamPromise = (async () => {
          for await (const chunk of generator) {
            // Handle different chunk formats
            if (typeof chunk === 'string') {
              fullResponse += chunk;
            } else if (chunk && chunk.content) {
              fullResponse += chunk.content;
            } else if (chunk && chunk.delta && chunk.delta.content) {
              fullResponse += chunk.delta.content;
            }
          }
        })();

        // Race between streaming and timeout
        await Promise.race([streamPromise, timeoutPromise]);
      } catch (streamError) {
        logger.error('Error during streaming:', streamError);
        throw streamError;
      }
      
      const responseTime = Date.now() - startTime;
      
      logger.info(`Model invocation completed in ${responseTime}ms`);
      
      return {
        content: fullResponse,
        responseTime,
        fullResponse: { content: fullResponse }
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Bedrock model invocation failed:', {
        error: error.message,
        stack: error.stack,
        modelId,
        region: this.region
      });
      
      throw {
        error: error.message || 'Unknown error',
        responseTime,
        code: error.name || 'BedrockError'
      };
    }
  }

  /**
   * Test the connection to Bedrock
   */
  async testConnection() {
    try {
      // Use a simple test with Claude Haiku (smallest/cheapest model)
      const result = await this.invokeModel(
        'anthropic.claude-3-haiku-20240307-v1:0',
        'Hello, please respond with just "OK" to test the connection.',
        { maxTokens: 10, temperature: 0 }
      );
      
      return {
        success: true,
        responseTime: result.responseTime,
        content: result.content
      };
    } catch (error) {
      return {
        success: false,
        error: error.error || error.message,
        responseTime: error.responseTime || 0
      };
    }
  }
}

export default new BedrockService();