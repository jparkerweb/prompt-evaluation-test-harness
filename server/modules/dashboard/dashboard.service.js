import { getDatabase } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

class DashboardService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    const db = getDatabase();

    try {
      // Get counts for all resources
      const [datasetsCount, promptsCount, evaluationsCount] = await Promise.all([
        this.getDatasetCount(db),
        this.getPromptCount(db),
        this.getEvaluationCount(db)
      ]);

      // Get recent evaluations with performance metrics
      const recentEvaluations = await this.getRecentEvaluations(db);

      return {
        counts: {
          datasets: datasetsCount,
          prompts: promptsCount,
          evaluations: evaluationsCount
        },
        recentEvaluations
      };
    } catch (error) {
      logger.error('Failed to fetch dashboard stats:', error);
      throw new AppError('Failed to fetch dashboard stats', 500);
    }
  }

  /**
   * Get dataset count
   */
  async getDatasetCount(db) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM datasets',
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });
  }

  /**
   * Get prompt count
   */
  async getPromptCount(db) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM prompts',
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });
  }

  /**
   * Get evaluation count
   */
  async getEvaluationCount(db) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM evaluations',
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });
  }

  /**
   * Get recent evaluations for dashboard
   */
  async getRecentEvaluations(db, limit = 5) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          e.id,
          e.name,
          e.status,
          e.accuracy,
          e.created_at,
          e.completed_at,
          e.processed_messages,
          e.total_messages,
          e.total_time_ms,
          p.name as prompt_name,
          d.name as dataset_name,
          u.username as created_by_username
        FROM evaluations e
        LEFT JOIN prompts p ON e.prompt_id = p.id
        LEFT JOIN datasets d ON e.dataset_id = d.id
        LEFT JOIN users u ON e.created_by = u.id
        WHERE 1=1
        ORDER BY e.created_at DESC
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

export default new DashboardService();