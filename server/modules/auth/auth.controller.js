import authService from './auth.service.js';
import { AppError } from '../../middleware/errorHandler.js';

class AuthController {
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        throw new AppError('Username and password are required', 400);
      }
      
      const result = await authService.login(username, password);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
  
  async register(req, res, next) {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        throw new AppError('Username and password are required', 400);
      }
      
      if (password.length < 6) {
        throw new AppError('Password must be at least 6 characters', 400);
      }
      
      const user = await authService.createUser(username, password);
      res.status(201).json({ message: 'User created successfully', user });
    } catch (error) {
      next(error);
    }
  }
  
  async logout(req, res) {
    // Since we're using JWT, logout is handled client-side
    res.json({ message: 'Logged out successfully' });
  }
  
  async getMe(req, res, next) {
    try {
      const user = await authService.getUser(req.user.id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();