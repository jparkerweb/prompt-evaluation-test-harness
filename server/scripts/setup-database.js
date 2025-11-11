import { getDatabase } from '../config/database.js';
import logger from '../utils/logger.js';

const databaseSchema = [
  // Create users table
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // Create datasets table
  `CREATE TABLE IF NOT EXISTS datasets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  
  // Create dataset_messages table
  `CREATE TABLE IF NOT EXISTS dataset_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER NOT NULL,
    messageContent TEXT NOT NULL,
    label BOOLEAN NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id)
  )`,
  
  // Create prompts table
  `CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    modelId TEXT NOT NULL,
    promptText TEXT NOT NULL,
    maxTokens INTEGER,
    temperature REAL,
    topP REAL,
    stopSequences TEXT,
    openingTag TEXT,
    closingTag TEXT,
    parent_prompt_id INTEGER,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_prompt_id) REFERENCES prompts(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  
  // Create evaluations table
  `CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_id INTEGER NOT NULL,
    dataset_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    total_messages INTEGER,
    processed_messages INTEGER DEFAULT 0,
    correct_predictions INTEGER DEFAULT NULL,
    incorrect_predictions INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT NULL,
    accuracy REAL DEFAULT NULL,
    total_time_ms INTEGER DEFAULT 0,
    started_at DATETIME,
    completed_at DATETIME,
    last_heartbeat DATETIME,
    timeout_at DATETIME,
    can_resume BOOLEAN DEFAULT 0,
    failure_reason TEXT,
    server_start_time DATETIME,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prompt_id) REFERENCES prompts(id),
    FOREIGN KEY (dataset_id) REFERENCES datasets(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  
  // Create evaluation_results table
  `CREATE TABLE IF NOT EXISTS evaluation_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluation_id INTEGER NOT NULL,
    dataset_message_id INTEGER NOT NULL,
    llmLabel BOOLEAN,
    llmFullResponse TEXT,
    response_time_ms INTEGER,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id),
    FOREIGN KEY (dataset_message_id) REFERENCES dataset_messages(id)
  )`,
  
  // Create indexes
  'CREATE INDEX IF NOT EXISTS idx_dataset_messages_dataset_id ON dataset_messages(dataset_id)',
  'CREATE INDEX IF NOT EXISTS idx_evaluation_results_evaluation_id ON evaluation_results(evaluation_id)',
  'CREATE INDEX IF NOT EXISTS idx_evaluations_status ON evaluations(status)',
  // Removed soft delete indexes
];

async function setupDatabase() {
  const db = getDatabase();
  
  logger.info('Setting up database schema...');
  
  for (const tableDefinition of databaseSchema) {
    await new Promise((resolve, reject) => {
      db.run(tableDefinition, (err) => {
        if (err) {
          logger.error('Database setup failed:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  
  // Add missing columns to existing evaluations table if they don't exist
  const columnsToAdd = [
    { name: 'last_heartbeat', definition: 'last_heartbeat DATETIME' },
    { name: 'timeout_at', definition: 'timeout_at DATETIME' },
    { name: 'can_resume', definition: 'can_resume BOOLEAN DEFAULT 0' },
    { name: 'failure_reason', definition: 'failure_reason TEXT' },
    { name: 'server_start_time', definition: 'server_start_time DATETIME' }
  ];
  
  for (const column of columnsToAdd) {
    try {
      await new Promise((resolve, reject) => {
        db.run(`ALTER TABLE evaluations ADD COLUMN ${column.definition}`, (err) => {
          if (err) {
            // Column might already exist, check if it's the expected error
            if (err.message.includes('duplicate column name')) {
              logger.info(`Column ${column.name} already exists in evaluations table`);
              resolve();
            } else {
              reject(err);
            }
          } else {
            logger.info(`Added column ${column.name} to evaluations table`);
            resolve();
          }
        });
      });
    } catch (err) {
      logger.error(`Failed to add column ${column.name}:`, err);
      // Don't fail the entire setup for column addition issues
    }
  }
  
  logger.info('Database setup completed successfully');
}

// Run database setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Database setup failed:', error);
      process.exit(1);
    });
}

export { setupDatabase };