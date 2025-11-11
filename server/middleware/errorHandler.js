import logger from '../utils/logger.js';

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

function errorHandler(err, req, res, next) {
  let { statusCode = 500, message } = err;
  
  // Log error
  logger.error(`${req.method} ${req.url} - ${err.message}`, {
    error: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    user: req.user?.id
  });
  
  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    message = 'Internal server error';
  }
  
  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}

export { AppError, errorHandler };