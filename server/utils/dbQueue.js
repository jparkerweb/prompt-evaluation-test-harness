import { getDatabase } from '../config/database.js';
import logger from './logger.js';

/**
 * Database operation queue to prevent SQLite write contention
 * SQLite can only handle one write at a time, so we queue them
 */
class DatabaseQueue {
  constructor() {
    this.writeQueue = [];
    this.isProcessing = false;
    this.db = getDatabase();
  }

  /**
   * Add a write operation to the queue
   */
  async queueWrite(operation, description = 'Database write') {
    return new Promise((resolve, reject) => {
      this.writeQueue.push({
        operation,
        resolve,
        reject,
        description
      });
      
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued write operations sequentially
   */
  async processQueue() {
    if (this.isProcessing || this.writeQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.writeQueue.length > 0) {
      const { operation, resolve, reject, description } = this.writeQueue.shift();
      
      try {
        logger.debug(`Processing queued operation: ${description}`);
        const result = await operation();
        resolve(result);
      } catch (error) {
        logger.error(`Failed queued operation: ${description}`, error);
        reject(error);
      }
      
      // Small delay between operations to prevent blocking
      if (this.writeQueue.length > 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    this.isProcessing = false;
  }

  /**
   * Execute a read operation directly (no queueing needed for reads)
   */
  async executeRead(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Execute a write operation through the queue
   */
  async executeWrite(sql, params = [], description = 'Database write') {
    return this.queueWrite(() => {
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    }, description);
  }
}

// Export singleton instance
export default new DatabaseQueue();