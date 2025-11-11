import { describe, it, expect } from 'vitest';
import JSONLParser from './jsonl.js';

describe('JSONLParser', () => {
  describe('parseJSONL', () => {
    it('should parse valid JSONL content', () => {
      const content = `{"messageContent": "Hello world", "label": true}
{"messageContent": "Goodbye", "label": false}`;
      
      const result = JSONLParser.parseJSONL(content);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        messageContent: "Hello world",
        label: true
      });
      expect(result[1]).toEqual({
        messageContent: "Goodbye", 
        label: false
      });
    });
    
    it('should handle extra whitespace in messageContent', () => {
      const content = `{"messageContent": "  Hello world  ", "label": true}`;
      
      const result = JSONLParser.parseJSONL(content);
      
      expect(result[0].messageContent).toBe("Hello world");
    });
    
    it('should ignore empty lines', () => {
      const content = `{"messageContent": "Hello", "label": true}

{"messageContent": "World", "label": false}

`;
      
      const result = JSONLParser.parseJSONL(content);
      
      expect(result).toHaveLength(2);
    });
    
    it('should throw error for missing messageContent', () => {
      const content = `{"label": true}`;
      
      expect(() => {
        JSONLParser.parseJSONL(content);
      }).toThrow("Line 1: Missing required fields 'messageContent' and 'label'");
    });
    
    it('should throw error for missing label', () => {
      const content = `{"messageContent": "Hello"}`;
      
      expect(() => {
        JSONLParser.parseJSONL(content);
      }).toThrow("Line 1: Missing required fields 'messageContent' and 'label'");
    });
    
    it('should throw error for empty messageContent', () => {
      const content = `{"messageContent": "", "label": true}`;
      
      expect(() => {
        JSONLParser.parseJSONL(content);
      }).toThrow("Line 1: 'messageContent' must be a non-empty string");
    });
    
    it('should throw error for invalid label', () => {
      const content = `{"messageContent": "Hello", "label": "true"}`;
      
      expect(() => {
        JSONLParser.parseJSONL(content);
      }).toThrow("Line 1: 'label' must be a boolean (true/false) or numeric (1/0)");
    });
    
    it('should accept numeric 1 as true', () => {
      const content = `{"messageContent": "Hello", "label": 1}
{"messageContent": "World", "label": 0}`;
      
      const result = JSONLParser.parseJSONL(content);
      
      expect(result).toHaveLength(2);
      expect(result[0].label).toBe(true);
      expect(result[1].label).toBe(false);
    });
    
    it('should accept string "1" as true and "0" as false', () => {
      const content = `{"messageContent": "Hello", "label": "1"}
{"messageContent": "World", "label": "0"}`;
      
      const result = JSONLParser.parseJSONL(content);
      
      expect(result).toHaveLength(2);
      expect(result[0].label).toBe(true);
      expect(result[1].label).toBe(false);
    });
    
    it('should throw error for invalid JSON', () => {
      const content = `{"messageContent": "Hello", "label": true
{"messageContent": "World", "label": false}`;
      
      expect(() => {
        JSONLParser.parseJSONL(content);
      }).toThrow("Line 1: Invalid JSON format");
    });
    
    it('should throw error for empty file', () => {
      const content = '';
      
      expect(() => {
        JSONLParser.parseJSONL(content);
      }).toThrow('File must contain at least one valid message');
    });
  });
  
  describe('validateFileSize', () => {
    it('should accept files under size limit', () => {
      const file = { size: 1024 * 1024 }; // 1MB
      
      expect(() => {
        JSONLParser.validateFileSize(file, 50);
      }).not.toThrow();
    });
    
    it('should reject files over size limit', () => {
      const file = { size: 51 * 1024 * 1024 }; // 51MB
      
      expect(() => {
        JSONLParser.validateFileSize(file, 50);
      }).toThrow('File size exceeds 50MB limit');
    });
  });
  
  describe('validateFileType', () => {
    it('should accept .jsonl files', () => {
      const file = { 
        originalname: 'test.jsonl',
        mimetype: 'text/plain'
      };
      
      expect(() => {
        JSONLParser.validateFileType(file);
      }).not.toThrow();
    });
    
    it('should accept .json files', () => {
      const file = { 
        originalname: 'test.json',
        mimetype: 'application/json'
      };
      
      expect(() => {
        JSONLParser.validateFileType(file);
      }).not.toThrow();
    });
    
    it('should reject other file types', () => {
      const file = { 
        originalname: 'test.txt',
        mimetype: 'text/plain'
      };
      
      expect(() => {
        JSONLParser.validateFileType(file);
      }).toThrow('File must be a JSONL or JSON file');
    });
  });
});