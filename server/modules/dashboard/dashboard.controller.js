import dashboardService from './dashboard.service.js';
import { AppError } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

class DashboardController {
  /**
   * Get dashboard statistics
   */
  async getStats(req, res, next) {
    try {
      const stats = await dashboardService.getDashboardStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new DashboardController();