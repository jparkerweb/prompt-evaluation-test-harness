import 'dotenv/config';
import authService from '../modules/auth/auth.service.js';
import logger from '../utils/logger.js';

async function seedTestUser() {
  try {
    await authService.createUser('testuser', 'password123');
    logger.info('Test user created successfully');
    console.log('Test user created: username=testuser, password=password123');
  } catch (error) {
    if (error.message === 'Username already exists') {
      console.log('Test user already exists');
    } else {
      logger.error('Failed to create test user:', error);
      console.error('Failed to create test user:', error.message);
    }
  }
  process.exit(0);
}

seedTestUser();