import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';

function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new AppError('No token provided', 401);
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
}

// Special auth middleware for SSE that accepts token from query param or header
function sseAuthMiddleware(req, res, next) {
  try {
    // Try to get token from Authorization header first, then query param
    let token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      token = req.query.token;
    }
    
    if (!token) {
      throw new AppError('No token provided', 401);
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
}

export { authMiddleware, sseAuthMiddleware };