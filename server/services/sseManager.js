import logger from '../utils/logger.js';

class SSEManager {
  constructor() {
    // Map of evaluation ID -> array of SSE connections
    this.connections = new Map();
  }

  /**
   * Add a new SSE connection for an evaluation
   */
  addConnection(evaluationId, res) {
    if (!this.connections.has(evaluationId)) {
      this.connections.set(evaluationId, []);
    }
    
    this.connections.get(evaluationId).push(res);
    logger.info(`Added SSE connection for evaluation ${evaluationId}. Total connections: ${this.connections.get(evaluationId).length}`);
    
    // Clean up connection when client disconnects
    res.on('close', () => {
      this.removeConnection(evaluationId, res);
    });
  }

  /**
   * Remove an SSE connection
   */
  removeConnection(evaluationId, res) {
    if (this.connections.has(evaluationId)) {
      const connections = this.connections.get(evaluationId);
      const index = connections.indexOf(res);
      if (index !== -1) {
        connections.splice(index, 1);
        logger.info(`Removed SSE connection for evaluation ${evaluationId}. Remaining connections: ${connections.length}`);
        
        // Remove the evaluation entry if no connections remain
        if (connections.length === 0) {
          this.connections.delete(evaluationId);
          logger.info(`No more connections for evaluation ${evaluationId}, cleaned up`);
        }
      }
    }
  }

  /**
   * Broadcast evaluation update to all connected clients
   */
  broadcastEvaluationUpdate(evaluationId, evaluationData) {
    logger.info(`[SSE] Broadcasting update for evaluation ${evaluationId}, status: ${evaluationData.status}, progress: ${evaluationData.processed_messages}/${evaluationData.total_messages}`);
    
    if (!this.connections.has(evaluationId)) {
      logger.info(`[SSE] No connections found for evaluation ${evaluationId}`);
      return; // No connections for this evaluation
    }

    const connections = this.connections.get(evaluationId);
    const message = `data: ${JSON.stringify({ 
      type: 'evaluation', 
      data: evaluationData 
    })}\n\n`;

    logger.info(`[SSE] Sending message to ${connections.length} connections: ${message.trim()}`);

    // Send to all connected clients for this evaluation
    // Track failed connections to remove them after iteration
    const failedConnections = [];
    
    connections.forEach((res, index) => {
      try {
        res.write(message);
        logger.info(`[SSE] Successfully sent message to connection ${index}`);
      } catch (error) {
        logger.error(`[SSE] Failed to send SSE message to connection ${index}:`, error);
        // Mark connection for removal
        failedConnections.push(res);
      }
    });

    // Remove failed connections after iteration to avoid array modification issues
    failedConnections.forEach(failedRes => {
      const index = connections.indexOf(failedRes);
      if (index !== -1) {
        connections.splice(index, 1);
      }
    });

    logger.info(`[SSE] Broadcasted update to ${connections.length} connections for evaluation ${evaluationId}`);
  }

  /**
   * Broadcast evaluation completion to all connected clients
   */
  broadcastEvaluationComplete(evaluationId, evaluationData) {
    if (!this.connections.has(evaluationId)) {
      return;
    }

    const connections = this.connections.get(evaluationId);
    const message = `data: ${JSON.stringify({ 
      type: 'complete', 
      data: evaluationData 
    })}\n\n`;

    // Send completion message and close connections
    connections.forEach((res, index) => {
      try {
        res.write(message);
        res.end();
      } catch (error) {
        logger.error(`Failed to send completion SSE message to connection ${index}:`, error);
      }
    });

    // Clean up all connections for this evaluation
    this.connections.delete(evaluationId);
    logger.info(`Broadcasted completion and closed ${connections.length} connections for evaluation ${evaluationId}`);
  }

  /**
   * Get the number of active connections for an evaluation
   */
  getConnectionCount(evaluationId) {
    return this.connections.has(evaluationId) ? this.connections.get(evaluationId).length : 0;
  }

  /**
   * Get total number of active connections across all evaluations
   */
  getTotalConnectionCount() {
    let total = 0;
    for (const connections of this.connections.values()) {
      total += connections.length;
    }
    return total;
  }

  /**
   * Broadcast any event to all connected clients
   */
  broadcastEvent(evaluationId, eventData) {
    if (!this.connections.has(evaluationId)) {
      logger.info(`[SSE] No connections found for evaluation ${evaluationId} to broadcast event type: ${eventData.type}`);
      return;
    }

    const connections = this.connections.get(evaluationId);
    const message = `data: ${JSON.stringify(eventData)}\n\n`;

    logger.info(`[SSE] Broadcasting ${eventData.type} event to ${connections.length} connections for evaluation ${evaluationId}`);

    // Send to all connected clients for this evaluation
    // Track failed connections to remove them after iteration
    const failedConnections = [];
    
    connections.forEach((res, index) => {
      try {
        res.write(message);
      } catch (error) {
        logger.error(`[SSE] Failed to send ${eventData.type} event to connection ${index}:`, error);
        // Mark connection for removal
        failedConnections.push(res);
      }
    });

    // Remove failed connections after iteration to avoid array modification issues
    failedConnections.forEach(failedRes => {
      const index = connections.indexOf(failedRes);
      if (index !== -1) {
        connections.splice(index, 1);
      }
    });
  }
}

// Export singleton instance
export default new SSEManager();