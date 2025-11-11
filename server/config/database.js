import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlite3Verbose = sqlite3.verbose();

// Always resolve database path relative to project root (parent of server folder)
const projectRoot = path.resolve(__dirname, '..', '..');
const dbPath = process.env.DB_PATH 
  ? path.resolve(process.env.DB_PATH)
  : path.join(projectRoot, 'database.sqlite');

let db = null;

function getDatabase() {
  if (!db) {
    logger.info(`Opening database at: ${dbPath}`);
    db = new sqlite3Verbose.Database(dbPath, (err) => {
      if (err) {
        logger.error('Error opening database:', err);
        throw err;
      }
      logger.info('Connected to SQLite database');
    });
    
    // Enable WAL mode for better performance
    db.run('PRAGMA journal_mode = WAL', (err) => {
      if (err) logger.error('Error setting WAL mode:', err);
    });
    
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) logger.error('Error enabling foreign keys:', err);
    });
  }
  return db;
}

// Promisified database methods
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function initializeDatabase() {
  try {
    // Read and execute database setup script
    const { setupDatabase } = await import('../scripts/setup-database.js');
    await setupDatabase();
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

export {
  getDatabase,
  run,
  get,
  all,
  initializeDatabase
};