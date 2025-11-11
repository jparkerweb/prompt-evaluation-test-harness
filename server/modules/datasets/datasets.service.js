import { run, get, all } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import JSONLParser from '../../services/jsonl.js';

class DatasetsService {
  async createDataset(name, jsonlContent, createdBy) {
    // Check if dataset name already exists
    const existingDataset = await get(
      'SELECT id FROM datasets WHERE name = ?',
      [name]
    );
    
    if (existingDataset) {
      throw new AppError('Dataset name already exists', 400);
    }
    
    // Parse JSONL content
    const messages = JSONLParser.parseJSONL(jsonlContent);
    
    // Create dataset
    const datasetResult = await run(
      'INSERT INTO datasets (name, created_by) VALUES (?, ?)',
      [name, createdBy]
    );
    
    const datasetId = datasetResult.id;
    
    // Insert messages
    for (const message of messages) {
      await run(
        'INSERT INTO dataset_messages (dataset_id, messageContent, label) VALUES (?, ?, ?)',
        [datasetId, message.messageContent, message.label]
      );
    }
    
    return {
      id: datasetId,
      name,
      messageCount: messages.length,
      createdBy
    };
  }
  
  async getDatasets(page = 1, pageSize = 50, sortBy = 'created_at', sortDirection = 'desc', filters = {}) {
    const limit = Math.min(pageSize, process.env.MAX_PAGE_SIZE || 100);
    const offset = (page - 1) * limit;
    
    // Build WHERE clause based on filters
    let whereClause = '1=1';
    let queryParams = [];
    
    if (filters.creator) {
      whereClause += ' AND u.username = ?';
      queryParams.push(filters.creator);
    }
    
    if (filters.created_at_from) {
      whereClause += ' AND DATE(d.created_at) >= ?';
      queryParams.push(filters.created_at_from);
    }
    
    if (filters.created_at_to) {
      whereClause += ' AND DATE(d.created_at) <= ?';
      queryParams.push(filters.created_at_to);
    }
    
    // Build ORDER BY clause
    const sortColumn = sortBy === 'created_by_username' ? 'u.username' : `d.${sortBy}`;
    const orderBy = sortBy === 'message_count' ? 
      `COUNT(DISTINCT dm.id) ${sortDirection.toUpperCase()}` : 
      `${sortColumn} ${sortDirection.toUpperCase()}`;
    
    // Get datasets with message counts and evaluation reference check
    const datasets = await all(`
      SELECT 
        d.id,
        d.name,
        d.created_by,
        d.created_at,
        u.username as created_by_username,
        COUNT(DISTINCT dm.id) as message_count,
        CASE WHEN e.dataset_id IS NOT NULL THEN 1 ELSE 0 END as is_referenced_in_evaluations
      FROM datasets d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN dataset_messages dm ON d.id = dm.dataset_id
      LEFT JOIN (
        SELECT DISTINCT dataset_id 
        FROM evaluations
      ) e ON d.id = e.dataset_id
      WHERE ${whereClause}
      GROUP BY d.id, d.name, d.created_by, d.created_at, u.username, e.dataset_id
      HAVING 1=1
      ${filters.message_count_min ? 'AND COUNT(DISTINCT dm.id) >= ?' : ''}
      ${filters.message_count_max ? 'AND COUNT(DISTINCT dm.id) <= ?' : ''}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `, [
      ...queryParams,
      ...(filters.message_count_min ? [filters.message_count_min] : []),
      ...(filters.message_count_max ? [filters.message_count_max] : []),
      limit, 
      offset
    ]);
    
    // Build count query with same filters
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM (
        SELECT d.id
        FROM datasets d
        LEFT JOIN users u ON d.created_by = u.id
        LEFT JOIN dataset_messages dm ON d.id = dm.dataset_id
        WHERE ${whereClause}
        GROUP BY d.id
        HAVING 1=1
        ${filters.message_count_min ? 'AND COUNT(dm.id) >= ?' : ''}
        ${filters.message_count_max ? 'AND COUNT(dm.id) <= ?' : ''}
      ) subquery
    `;
    
    const totalResult = await get(countQuery, [
      ...queryParams,
      ...(filters.message_count_min ? [filters.message_count_min] : []),
      ...(filters.message_count_max ? [filters.message_count_max] : [])
    ]);
    
    return {
      datasets,
      pagination: {
        page,
        pageSize: limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / limit)
      }
    };
  }
  
  async getDatasetById(id) {
    const dataset = await get(`
      SELECT 
        d.id,
        d.name,
        d.created_by,
        d.created_at,
        u.username as created_by_username,
        COUNT(DISTINCT dm.id) as message_count,
        CASE WHEN e.dataset_id IS NOT NULL THEN 1 ELSE 0 END as is_referenced_in_evaluations
      FROM datasets d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN dataset_messages dm ON d.id = dm.dataset_id
      LEFT JOIN (
        SELECT DISTINCT dataset_id 
        FROM evaluations
      ) e ON d.id = e.dataset_id
      WHERE d.id = ?
      GROUP BY d.id, d.name, d.created_by, d.created_at, u.username, e.dataset_id
    `, [id]);
    
    if (!dataset) {
      throw new AppError('Dataset not found', 404);
    }
    
    return dataset;
  }
  
  async getDatasetMessages(datasetId, page = 1, pageSize = 50) {
    // Verify dataset exists
    await this.getDatasetById(datasetId);
    
    const limit = Math.min(pageSize, process.env.MAX_PAGE_SIZE || 100);
    const offset = (page - 1) * limit;
    
    const messages = await all(`
      SELECT id, messageContent, label, created_at
      FROM dataset_messages
      WHERE dataset_id = ?
      ORDER BY id ASC
      LIMIT ? OFFSET ?
    `, [datasetId, limit, offset]);
    
    // Get total count
    const totalResult = await get(
      'SELECT COUNT(*) as total FROM dataset_messages WHERE dataset_id = ?',
      [datasetId]
    );
    
    return {
      messages,
      pagination: {
        page,
        pageSize: limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / limit)
      }
    };
  }
  
  async updateDatasetName(id, name, userId) {
    const dataset = await this.getDatasetById(id);
    
    // Check if user owns the dataset
    if (dataset.created_by !== userId) {
      throw new AppError('You can only edit datasets you created', 403);
    }
    
    // Check if new name already exists
    const existingDataset = await get(
      'SELECT id FROM datasets WHERE name = ? AND id != ?',
      [name, id]
    );
    
    if (existingDataset) {
      throw new AppError('A dataset with this name already exists', 409);
    }
    
    await run(
      'UPDATE datasets SET name = ? WHERE id = ?',
      [name, id]
    );
    
    return this.getDatasetById(id);
  }
  
  async deleteDataset(id, userId) {
    const dataset = await this.getDatasetById(id);
    
    // Check if user owns the dataset
    if (dataset.created_by !== userId) {
      throw new AppError('Not authorized to delete this dataset', 403);
    }
    
    // Check if dataset is used in any evaluations
    const evaluationCount = await get(
      'SELECT COUNT(*) as count FROM evaluations WHERE dataset_id = ?',
      [id]
    );
    
    if (evaluationCount.count > 0) {
      throw new AppError('Cannot delete dataset that has been used in evaluations', 400);
    }
    
    // Hard delete the dataset and its messages
    await run(
      'DELETE FROM dataset_messages WHERE dataset_id = ?',
      [id]
    );
    
    await run(
      'DELETE FROM datasets WHERE id = ?',
      [id]
    );
    
    return { message: 'Dataset deleted successfully' };
  }
  
  async getDatasetStats() {
    const stats = await get(`
      SELECT 
        COUNT(*) as total_datasets,
        SUM(message_counts.count) as total_messages
      FROM datasets d
      LEFT JOIN (
        SELECT dataset_id, COUNT(*) as count
        FROM dataset_messages
        GROUP BY dataset_id
      ) message_counts ON d.id = message_counts.dataset_id
      WHERE 1=1
    `);
    
    return {
      totalDatasets: stats.total_datasets || 0,
      totalMessages: stats.total_messages || 0
    };
  }
  
  async createDatasetMessage(datasetId, label, messageContent) {
    // First check if the dataset exists
    const dataset = await this.getDatasetById(datasetId);
    
    // Check if dataset is used in any evaluations
    const evaluationCount = await get(
      'SELECT COUNT(*) as count FROM evaluations WHERE dataset_id = ?',
      [datasetId]
    );
    
    if (evaluationCount.count > 0) {
      throw new AppError('Cannot add messages to a dataset that has been used in evaluations', 400);
    }
    
    // Insert the new message
    const result = await run(
      'INSERT INTO dataset_messages (dataset_id, messageContent, label) VALUES (?, ?, ?)',
      [datasetId, messageContent, label]
    );
    
    // Return the created message
    return {
      id: result.id,
      dataset_id: datasetId,
      label,
      messageContent
    };
  }
  
  async updateDatasetMessage(datasetId, messageId, label, messageContent) {
    // First check if the dataset exists
    const dataset = await this.getDatasetById(datasetId);
    
    // Check if dataset is used in any evaluations
    const evaluationCount = await get(
      'SELECT COUNT(*) as count FROM evaluations WHERE dataset_id = ?',
      [datasetId]
    );
    
    if (evaluationCount.count > 0) {
      throw new AppError('Cannot edit messages in a dataset that has been used in evaluations', 400);
    }
    
    // Check if the message exists and belongs to this dataset
    const message = await get(
      'SELECT * FROM dataset_messages WHERE id = ? AND dataset_id = ?',
      [messageId, datasetId]
    );
    
    if (!message) {
      throw new AppError('Message not found in this dataset', 404);
    }
    
    // Update the message
    await run(
      'UPDATE dataset_messages SET label = ?, messageContent = ? WHERE id = ?',
      [label, messageContent, messageId]
    );
    
    // Return the updated message
    return {
      id: messageId,
      dataset_id: datasetId,
      label,
      messageContent
    };
  }
  
  async deleteDatasetMessage(datasetId, messageId, userId) {
    // First check if the dataset exists
    const dataset = await this.getDatasetById(datasetId);
    
    // Check if user owns the dataset
    if (dataset.created_by !== userId) {
      throw new AppError('Not authorized to delete messages from this dataset', 403);
    }
    
    // Check if dataset is used in any evaluations
    const evaluationCount = await get(
      'SELECT COUNT(*) as count FROM evaluations WHERE dataset_id = ?',
      [datasetId]
    );
    
    if (evaluationCount.count > 0) {
      throw new AppError('Cannot delete messages from a dataset that has been used in evaluations', 400);
    }
    
    // Check if the message exists and belongs to this dataset
    const message = await get(
      'SELECT * FROM dataset_messages WHERE id = ? AND dataset_id = ?',
      [messageId, datasetId]
    );
    
    if (!message) {
      throw new AppError('Message not found in this dataset', 404);
    }
    
    // Check if this is the last message
    const messageCount = await get(
      'SELECT COUNT(*) as count FROM dataset_messages WHERE dataset_id = ?',
      [datasetId]
    );
    
    if (messageCount.count <= 1) {
      throw new AppError('Cannot delete the last message in a dataset', 400);
    }
    
    // Delete the message
    await run(
      'DELETE FROM dataset_messages WHERE id = ?',
      [messageId]
    );
  }
  
  async createBlankDataset(name, createdBy) {
    // Check if dataset name already exists
    const existingDataset = await get(
      'SELECT id FROM datasets WHERE name = ?',
      [name]
    );
    
    if (existingDataset) {
      throw new AppError('Dataset name already exists', 400);
    }
    
    // Create blank dataset
    const datasetResult = await run(
      'INSERT INTO datasets (name, created_by) VALUES (?, ?)',
      [name, createdBy]
    );
    
    return {
      id: datasetResult.id,
      name,
      messageCount: 0,
      createdBy
    };
  }
  
  async addMessagesToDataset(datasetId, jsonlContent) {
    // First check if the dataset exists
    const dataset = await this.getDatasetById(datasetId);
    
    // Check if dataset is used in any evaluations
    const evaluationCount = await get(
      'SELECT COUNT(*) as count FROM evaluations WHERE dataset_id = ?',
      [datasetId]
    );
    
    if (evaluationCount.count > 0) {
      throw new AppError('Cannot add messages to a dataset that has been used in evaluations', 400);
    }
    
    // Parse JSONL content
    const messages = JSONLParser.parseJSONL(jsonlContent);
    
    // Insert messages
    let addedCount = 0;
    for (const message of messages) {
      await run(
        'INSERT INTO dataset_messages (dataset_id, messageContent, label) VALUES (?, ?, ?)',
        [datasetId, message.messageContent, message.label]
      );
      addedCount++;
    }
    
    return {
      datasetId,
      addedMessages: addedCount,
      totalMessages: addedCount
    };
  }
}

export default new DatasetsService();