import { AppError } from '../middleware/errorHandler.js';

class JSONLParser {
  static parseJSONL(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const messages = [];
    
    for (let i = 0; i < lines.length; i++) {
      const lineNumber = i + 1;
      
      try {
        const obj = JSON.parse(lines[i]);
        
        // Validate required fields
        if (!obj.hasOwnProperty('messageContent') || !obj.hasOwnProperty('label')) {
          throw new AppError(`Line ${lineNumber}: Missing required fields 'messageContent' and 'label'`, 400);
        }
        
        // Validate messageContent
        if (typeof obj.messageContent !== 'string' || obj.messageContent.trim() === '') {
          throw new AppError(`Line ${lineNumber}: 'messageContent' must be a non-empty string`, 400);
        }
        
        // Validate and normalize label
        let normalizedLabel;
        if (typeof obj.label === 'boolean') {
          normalizedLabel = obj.label;
        } else if (obj.label === 1 || obj.label === '1') {
          normalizedLabel = true;
        } else if (obj.label === 0 || obj.label === '0') {
          normalizedLabel = false;
        } else {
          throw new AppError(`Line ${lineNumber}: 'label' must be a boolean (true/false) or numeric (1/0)`, 400);
        }
        
        messages.push({
          messageContent: obj.messageContent.trim(),
          label: normalizedLabel
        });
        
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        throw new AppError(`Line ${lineNumber}: Invalid JSON format`, 400);
      }
    }
    
    if (messages.length === 0) {
      throw new AppError('File must contain at least one valid message', 400);
    }
    
    return messages;
  }
  
  static validateFileSize(file, maxSizeMB = 50) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new AppError(`File size exceeds ${maxSizeMB}MB limit`, 400);
    }
  }
  
  static validateFileType(file) {
    const isValidExtension = file.originalname.toLowerCase().endsWith('.jsonl') || 
                           file.originalname.toLowerCase().endsWith('.json');
    
    if (!isValidExtension) {
      throw new AppError('File must be a JSONL or JSON file', 400);
    }
  }
}

export default JSONLParser;