import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock logger before importing
vi.mock('../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

describe('SSEManager', () => {
  let sseManager
  let logger
  let mockRes1
  let mockRes2
  let mockRes3
  
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    
    logger = (await import('../utils/logger.js')).default
    
    // Create fresh SSEManager instance
    const SSEManagerModule = await import('./sseManager.js')
    sseManager = SSEManagerModule.default
    
    // Reset the connections map
    sseManager.connections.clear()
    
    // Mock response objects
    mockRes1 = {
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn()
    }
    
    mockRes2 = {
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn()
    }
    
    mockRes3 = {
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn()
    }
  })

  describe('addConnection', () => {
    it('should add first connection for evaluation', () => {
      sseManager.addConnection('eval-1', mockRes1)
      
      expect(sseManager.connections.has('eval-1')).toBe(true)
      expect(sseManager.connections.get('eval-1')).toHaveLength(1)
      expect(sseManager.connections.get('eval-1')[0]).toBe(mockRes1)
      expect(logger.info).toHaveBeenCalledWith('Added SSE connection for evaluation eval-1. Total connections: 1')
    })

    it('should add multiple connections for same evaluation', () => {
      sseManager.addConnection('eval-1', mockRes1)
      sseManager.addConnection('eval-1', mockRes2)
      
      expect(sseManager.connections.get('eval-1')).toHaveLength(2)
      expect(sseManager.connections.get('eval-1')).toContain(mockRes1)
      expect(sseManager.connections.get('eval-1')).toContain(mockRes2)
    })

    it('should add connections for different evaluations', () => {
      sseManager.addConnection('eval-1', mockRes1)
      sseManager.addConnection('eval-2', mockRes2)
      
      expect(sseManager.connections.has('eval-1')).toBe(true)
      expect(sseManager.connections.has('eval-2')).toBe(true)
      expect(sseManager.connections.get('eval-1')).toHaveLength(1)
      expect(sseManager.connections.get('eval-2')).toHaveLength(1)
    })

    it('should set up close event listener', () => {
      sseManager.addConnection('eval-1', mockRes1)
      
      expect(mockRes1.on).toHaveBeenCalledWith('close', expect.any(Function))
    })

    it('should call removeConnection when close event fires', () => {
      const removeConnectionSpy = vi.spyOn(sseManager, 'removeConnection')
      sseManager.addConnection('eval-1', mockRes1)
      
      // Simulate close event
      const closeCallback = mockRes1.on.mock.calls.find(call => call[0] === 'close')[1]
      closeCallback()
      
      expect(removeConnectionSpy).toHaveBeenCalledWith('eval-1', mockRes1)
    })
  })

  describe('removeConnection', () => {
    it('should remove specific connection', () => {
      sseManager.addConnection('eval-1', mockRes1)
      sseManager.addConnection('eval-1', mockRes2)
      
      sseManager.removeConnection('eval-1', mockRes1)
      
      expect(sseManager.connections.get('eval-1')).toHaveLength(1)
      expect(sseManager.connections.get('eval-1')).toContain(mockRes2)
      expect(sseManager.connections.get('eval-1')).not.toContain(mockRes1)
    })

    it('should remove evaluation entry when no connections remain', () => {
      sseManager.addConnection('eval-1', mockRes1)
      
      sseManager.removeConnection('eval-1', mockRes1)
      
      expect(sseManager.connections.has('eval-1')).toBe(false)
      expect(logger.info).toHaveBeenCalledWith('No more connections for evaluation eval-1, cleaned up')
    })

    it('should do nothing if evaluation does not exist', () => {
      sseManager.removeConnection('nonexistent', mockRes1)
      
      expect(logger.info).not.toHaveBeenCalled()
    })

    it('should do nothing if connection not found in evaluation', () => {
      sseManager.addConnection('eval-1', mockRes1)
      
      sseManager.removeConnection('eval-1', mockRes2) // Different connection
      
      expect(sseManager.connections.get('eval-1')).toHaveLength(1)
      expect(sseManager.connections.get('eval-1')).toContain(mockRes1)
    })

    it('should log remaining connection count', () => {
      sseManager.addConnection('eval-1', mockRes1)
      sseManager.addConnection('eval-1', mockRes2)
      
      sseManager.removeConnection('eval-1', mockRes1)
      
      expect(logger.info).toHaveBeenCalledWith('Removed SSE connection for evaluation eval-1. Remaining connections: 1')
    })
  })

  describe('broadcastEvaluationUpdate', () => {
    it('should broadcast to all connections for evaluation', () => {
      const evaluationData = {
        id: 'eval-1',
        status: 'running',
        processed_messages: 5,
        total_messages: 10
      }
      
      sseManager.addConnection('eval-1', mockRes1)
      sseManager.addConnection('eval-1', mockRes2)
      
      sseManager.broadcastEvaluationUpdate('eval-1', evaluationData)
      
      const expectedMessage = `data: ${JSON.stringify({ 
        type: 'evaluation', 
        data: evaluationData 
      })}\n\n`
      
      expect(mockRes1.write).toHaveBeenCalledWith(expectedMessage)
      expect(mockRes2.write).toHaveBeenCalledWith(expectedMessage)
    })

    it('should log when no connections found', () => {
      const evaluationData = { id: 'eval-1', status: 'running' }
      
      sseManager.broadcastEvaluationUpdate('eval-1', evaluationData)
      
      expect(logger.info).toHaveBeenCalledWith('[SSE] No connections found for evaluation eval-1')
    })

    it('should handle write errors and remove failed connections', () => {
      const evaluationData = { id: 'eval-1', status: 'running', processed_messages: 5, total_messages: 10 }
      const writeError = new Error('Connection closed')
      
      sseManager.addConnection('eval-1', mockRes1)
      sseManager.addConnection('eval-1', mockRes2)
      
      mockRes1.write.mockImplementation(() => { throw writeError })
      
      sseManager.broadcastEvaluationUpdate('eval-1', evaluationData)
      
      expect(logger.error).toHaveBeenCalledWith('[SSE] Failed to send SSE message to connection 0:', writeError)
      expect(mockRes2.write).toHaveBeenCalled() // Second connection should still work
    })

    it('should log broadcast details', () => {
      const evaluationData = {
        id: 'eval-1',
        status: 'running',
        processed_messages: 3,
        total_messages: 10
      }
      
      sseManager.addConnection('eval-1', mockRes1)
      
      sseManager.broadcastEvaluationUpdate('eval-1', evaluationData)
      
      expect(logger.info).toHaveBeenCalledWith('[SSE] Broadcasting update for evaluation eval-1, status: running, progress: 3/10')
      expect(logger.info).toHaveBeenCalledWith('[SSE] Broadcasted update to 1 connections for evaluation eval-1')
    })
  })

  describe('broadcastEvaluationComplete', () => {
    it('should broadcast completion and close connections', () => {
      const evaluationData = { id: 'eval-1', status: 'completed' }
      
      sseManager.addConnection('eval-1', mockRes1)
      sseManager.addConnection('eval-1', mockRes2)
      
      sseManager.broadcastEvaluationComplete('eval-1', evaluationData)
      
      const expectedMessage = `data: ${JSON.stringify({ 
        type: 'complete', 
        data: evaluationData 
      })}\n\n`
      
      expect(mockRes1.write).toHaveBeenCalledWith(expectedMessage)
      expect(mockRes2.write).toHaveBeenCalledWith(expectedMessage)
      expect(mockRes1.end).toHaveBeenCalled()
      expect(mockRes2.end).toHaveBeenCalled()
    })

    it('should clean up all connections after completion', () => {
      const evaluationData = { id: 'eval-1', status: 'completed' }
      
      sseManager.addConnection('eval-1', mockRes1)
      sseManager.addConnection('eval-1', mockRes2)
      
      sseManager.broadcastEvaluationComplete('eval-1', evaluationData)
      
      expect(sseManager.connections.has('eval-1')).toBe(false)
      expect(logger.info).toHaveBeenCalledWith('Broadcasted completion and closed 2 connections for evaluation eval-1')
    })

    it('should do nothing if no connections exist', () => {
      const evaluationData = { id: 'eval-1', status: 'completed' }
      
      sseManager.broadcastEvaluationComplete('eval-1', evaluationData)
      
      expect(logger.info).not.toHaveBeenCalled()
    })

    it('should handle write/end errors gracefully', () => {
      const evaluationData = { id: 'eval-1', status: 'completed' }
      const writeError = new Error('Connection error')
      
      sseManager.addConnection('eval-1', mockRes1)
      mockRes1.write.mockImplementation(() => { throw writeError })
      
      sseManager.broadcastEvaluationComplete('eval-1', evaluationData)
      
      expect(logger.error).toHaveBeenCalledWith('Failed to send completion SSE message to connection 0:', writeError)
      expect(sseManager.connections.has('eval-1')).toBe(false) // Still cleans up
    })
  })

  describe('getConnectionCount', () => {
    it('should return correct count for evaluation with connections', () => {
      sseManager.addConnection('eval-1', mockRes1)
      sseManager.addConnection('eval-1', mockRes2)
      
      expect(sseManager.getConnectionCount('eval-1')).toBe(2)
    })

    it('should return 0 for evaluation with no connections', () => {
      expect(sseManager.getConnectionCount('nonexistent')).toBe(0)
    })

    it('should return 0 after all connections removed', () => {
      sseManager.addConnection('eval-1', mockRes1)
      sseManager.removeConnection('eval-1', mockRes1)
      
      expect(sseManager.getConnectionCount('eval-1')).toBe(0)
    })
  })

  describe('getTotalConnectionCount', () => {
    it('should return total connections across all evaluations', () => {
      sseManager.addConnection('eval-1', mockRes1)
      sseManager.addConnection('eval-1', mockRes2)
      sseManager.addConnection('eval-2', mockRes3)
      
      expect(sseManager.getTotalConnectionCount()).toBe(3)
    })

    it('should return 0 when no connections exist', () => {
      expect(sseManager.getTotalConnectionCount()).toBe(0)
    })

    it('should update count as connections are added/removed', () => {
      sseManager.addConnection('eval-1', mockRes1)
      expect(sseManager.getTotalConnectionCount()).toBe(1)
      
      sseManager.addConnection('eval-2', mockRes2)
      expect(sseManager.getTotalConnectionCount()).toBe(2)
      
      sseManager.removeConnection('eval-1', mockRes1)
      expect(sseManager.getTotalConnectionCount()).toBe(1)
    })
  })

  describe('broadcastEvent', () => {
    it('should broadcast custom event to all connections', () => {
      const eventData = { type: 'custom', message: 'test event' }
      
      sseManager.addConnection('eval-1', mockRes1)
      sseManager.addConnection('eval-1', mockRes2)
      
      sseManager.broadcastEvent('eval-1', eventData)
      
      const expectedMessage = `data: ${JSON.stringify(eventData)}\n\n`
      
      expect(mockRes1.write).toHaveBeenCalledWith(expectedMessage)
      expect(mockRes2.write).toHaveBeenCalledWith(expectedMessage)
    })

    it('should log when no connections found', () => {
      const eventData = { type: 'custom', message: 'test' }
      
      sseManager.broadcastEvent('eval-1', eventData)
      
      expect(logger.info).toHaveBeenCalledWith('[SSE] No connections found for evaluation eval-1 to broadcast event type: custom')
    })

    it('should handle write errors and remove failed connections', () => {
      const eventData = { type: 'error-test', message: 'test' }
      const writeError = new Error('Write failed')
      
      sseManager.addConnection('eval-1', mockRes1)
      sseManager.addConnection('eval-1', mockRes2)
      
      mockRes1.write.mockImplementation(() => { throw writeError })
      
      sseManager.broadcastEvent('eval-1', eventData)
      
      expect(logger.error).toHaveBeenCalledWith('[SSE] Failed to send error-test event to connection 0:', writeError)
      expect(mockRes2.write).toHaveBeenCalled() // Second connection should work
    })

    it('should log broadcast information', () => {
      const eventData = { type: 'progress', data: { step: 1 } }
      
      sseManager.addConnection('eval-1', mockRes1)
      
      sseManager.broadcastEvent('eval-1', eventData)
      
      expect(logger.info).toHaveBeenCalledWith('[SSE] Broadcasting progress event to 1 connections for evaluation eval-1')
    })
  })

  describe('integration scenarios', () => {
    it('should handle multiple evaluations simultaneously', () => {
      // Setup connections for two evaluations
      sseManager.addConnection('eval-1', mockRes1)
      sseManager.addConnection('eval-2', mockRes2)
      sseManager.addConnection('eval-1', mockRes3)
      
      // Broadcast to eval-1 should only affect its connections
      const eval1Data = { id: 'eval-1', status: 'running' }
      sseManager.broadcastEvaluationUpdate('eval-1', eval1Data)
      
      expect(mockRes1.write).toHaveBeenCalled()
      expect(mockRes3.write).toHaveBeenCalled()
      expect(mockRes2.write).not.toHaveBeenCalled()
    })

    it('should clean up properly when closing connections', () => {
      sseManager.addConnection('eval-1', mockRes1)
      sseManager.addConnection('eval-1', mockRes2)
      
      expect(sseManager.getTotalConnectionCount()).toBe(2)
      
      // Complete evaluation should clean up all connections
      sseManager.broadcastEvaluationComplete('eval-1', { status: 'completed' })
      
      expect(sseManager.getTotalConnectionCount()).toBe(0)
      expect(sseManager.getConnectionCount('eval-1')).toBe(0)
    })
  })
})