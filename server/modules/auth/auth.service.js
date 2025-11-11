import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { run, get } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

class AuthService {
  async createUser(username, password) {
    // Check if user exists
    const existingUser = await get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      throw new AppError('Username already exists', 400);
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await run(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, passwordHash]
    );
    
    return { id: result.id, username };
  }
  
  async login(username, password) {
    // Get user
    const user = await get(
      'SELECT id, username, password_hash FROM users WHERE username = ?',
      [username]
    );
    
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    return {
      token,
      user: {
        id: user.id,
        username: user.username
      }
    };
  }
  
  async getUser(userId) {
    const user = await get(
      'SELECT id, username, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    return user;
  }
}

export default new AuthService();