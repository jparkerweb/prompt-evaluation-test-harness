import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import net from 'net';
import killPort from 'kill-port';

import { errorHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';
import { initializeDatabase } from './config/database.js';
import { setupDatabase } from './scripts/setup-database.js';

import authRoutes from './modules/auth/auth.routes.js';
import datasetRoutes from './modules/datasets/datasets.routes.js';
import promptRoutes from './modules/prompts/prompts.routes.js';
import evaluationRoutes from './routes/evaluations.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import configRoutes from './routes/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4444;
// Check if we're running from dist directory (production build)
const isProduction = __dirname.includes('dist');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/config', configRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// No Vite middleware needed in development - client runs separately

// Serve frontend in production only
if (isProduction) {
  // Production: serve built files from dist/client
  app.use(express.static(path.join(__dirname, '../client')));
  
  // Catch-all route for SPA - must be after all API routes
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../client/index.html'));
    } else {
      next();
    }
  });
}
// In development, frontend runs on separate port with proxy

// Error handling middleware (must be last)
app.use(errorHandler);

// Function to check if a port is actually free
function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

// Function to kill port with retry and verification
async function killPortSafely(port, maxRetries = 3) {
  logger.info(`Attempting to free port ${port}...`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // First check if port is already free
      if (await isPortFree(port)) {
        logger.info(` Port ${port} is already free`);
        return true;
      }
      
      // Kill the port
      await killPort(port);
      logger.info(` Kill command sent for port ${port}`);
      
      // Wait a bit for the process to actually die
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify the port is now free
      if (await isPortFree(port)) {
        logger.info(` Port ${port} successfully freed`);
        return true;
      }
      
      logger.info(`  Port ${port} still in use, retrying... (${i + 1}/${maxRetries})`);
    } catch (error) {
      logger.info(`  Error killing port ${port}: ${error.message}`);
      if (await isPortFree(port)) {
        logger.info(` Port ${port} is free despite error`);
        return true;
      }
    }
  }
  
  // Final check
  const isFree = await isPortFree(port);
  if (!isFree) {
    logger.error(` Failed to free port ${port} after ${maxRetries} attempts`);
    return false;
  }
  
  logger.info(` Port ${port} is now free`);
  return true;
}

// Initialize database and start server
async function startServer() {
  try {
    // Kill port safely with verification before starting
    logger.info(` Preparing to start server on port ${PORT}...`);
    const portFree = await killPortSafely(PORT);
    
    if (!portFree) {
      logger.error(' Could not free required port. Exiting.');
      process.exit(1);
    }
    
    await initializeDatabase();
    logger.info('Database initialized successfully');
    
    // Setup database schema (adds missing columns if needed)
    await setupDatabase();
    
    // Set server start time for evaluation tracking
    process.env.SERVER_START_TIME = new Date().toISOString();
    
    // Run startup recovery for stuck evaluations
    await runStartupRecovery();
    
    logger.info(' Port freed successfully! Starting server...');
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${isProduction ? 'production' : 'development'} mode`);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('\n Shutting down server...');
      await killPortSafely(PORT);
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle stuck evaluations on server startup
async function runStartupRecovery() {
  try {
    const { getDatabase } = await import('./config/database.js');
    const db = getDatabase();
    
    // Find evaluations that were running when server shut down
    const stuckEvaluations = await new Promise((resolve, reject) => {
      db.all(
        'SELECT id, name FROM evaluations WHERE status = "running"',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    if (stuckEvaluations.length > 0) {
      logger.info(`Found ${stuckEvaluations.length} evaluations stuck in 'running' state`);
      
      // Mark them as resumable
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE evaluations 
           SET can_resume = 1, 
               failure_reason = 'Evaluation was running when server restarted',
               server_start_time = ? 
           WHERE status = 'running'`,
          [process.env.SERVER_START_TIME],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      logger.info(`Marked ${stuckEvaluations.length} stuck evaluations as resumable`);
    } else {
      logger.info('No stuck evaluations found');
    }
  } catch (error) {
    logger.error('Failed to run startup recovery:', error);
    // Don't fail server startup for this
  }
}

startServer();