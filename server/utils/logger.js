import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.dirname(process.env.LOG_FILE_PATH || './logs/app.log');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    // File transport
    new winston.transports.File({
      filename: process.env.LOG_FILE_PATH || './logs/app.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Error file transport
    new winston.transports.File({
      filename: './logs/error.log',
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export default logger;