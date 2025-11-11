# OVERVIEW.md - 🧪 Prompt Evaluation Test Harness

**Version**: 1.0  
**Date**: August 2025  

---

## Executive Summary

The Prompt Evaluation Test Harness is a web-based application that enables teams to systematically evaluate and optimize Large Language Model (LLM) prompts against labeled datasets. This tool provides quantitative metrics, automated testing, and collaborative features to ensure consistent LLM behavior before deploying prompts to production systems.

### Key Benefits
- **Reduce Production Errors**: Test prompts thoroughly before deployment
- **Accelerate Development**: Rapidly iterate on prompt design with immediate feedback
- **Ensure Consistency**: Validate that prompts perform accurately across diverse inputs
- **Enable Collaboration**: Teams can share datasets, prompts, and results
- **Data-Driven Decisions**: Quantitative metrics guide prompt optimization

---

## Problem Statement & Solution

### Current Challenges

1. **Lack of Systematic Testing**
   - Teams currently test prompts manually with ad-hoc examples
   - No standardized process for validating prompt performance
   - Difficult to catch edge cases before production deployment

2. **Inconsistent Results**
   - Prompts behave unpredictably across different input types
   - No visibility into failure patterns
   - Time-consuming to identify why prompts fail

3. **Inefficient Development Process**
   - Engineers spend hours manually testing prompt variations
   - No easy way to compare different prompt strategies
   - Difficult to collaborate on prompt improvement

4. **Missing Performance Metrics**
   - No quantitative measure of prompt accuracy
   - Cannot track improvements over time
   - Difficult to justify prompt changes to stakeholders

### Our Solution

The platform provides a comprehensive workflow where users can:

1. **Upload labeled datasets** in JSONL format containing messages and expected classifications
2. **Create prompts** with configurable parameters and classification patterns
3. **Run automated evaluations** that test prompts against entire datasets
4. **View detailed metrics** including accuracy, precision, recall, and F1 scores
5. **Iterate quickly** by modifying prompts and re-running evaluations

### Example Use Case

A team building a customer service chatbot needs to classify incoming messages as either "conversational" (requiring human response) or "transactional" (automated handling). They:

1. Upload 1,000 labeled customer messages
2. Create a prompt instructing the LLM to classify messages
3. Run an evaluation to test the prompt
4. See that accuracy is only 78%
5. Refine the prompt with better instructions
6. Re-run evaluation and achieve 94% accuracy
7. Deploy the validated prompt to production with confidence

---

## Technology Stack & Architecture

### Tech Stack
- **Backend**: Node.js with Express.js, SQLite database
- **Frontend**: Vue.js 3 with Vue Router, Pinia state management, Tailwind CSS
- **LLM Integration**: AWS Bedrock via bedrock-wrapper with dynamic model loading
- **Authentication**: JWT with bcrypt password hashing
- **Build Tools**: Vite (frontend), Node.js (backend)

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Vue.js 3 Frontend (SPA)                   │
│                    - Router Guards                          │
│                    - Pinia State Management                 │
│                    - Tailwind CSS                           │
├─────────────────────────────────────────────────────────────┤
│                 Express.js REST API Server                  │
│                    - JWT Authentication                     │
│                    - Request Validation                     │
│                    - Error Handling                         │
├──────────────┬──────────────┬──────────────┬────────────────┤
│Auth Module   │Dataset Module│Prompt Module │Eval Module     │
├──────────────┴──────────────┴──────────────┴────────────────┤
│                    Shared Services Layer                    │
│  - Database Service  - Queue Manager  - LLM Service         │
│  - Parser Service    - Logger        - Metrics Calculator   │
├─────────────────────────────────────────────────────────────┤
│                   SQLite Database (file)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ AWS Bedrock API  │
                    │ (bedrock-wrapper)│
                    └──────────────────┘
```

### Core Data Flow
1. **Datasets**: Upload JSONL files with labeled data (messageContent + label boolean)
2. **Prompts**: Create templates with `{{messageContent}}` placeholders and output tags
3. **Evaluations**: Execute prompts against datasets using configurable LLM parameters
4. **Real-time Updates**: SSE connections provide live progress during evaluation execution
5. **Results Analysis**: Accuracy metrics, response times, and error handling with retry capabilities

---

## User Personas & Functional Requirements

### Primary Users

#### 1. ML/AI Engineers
- **Goals**: Develop accurate prompts for production systems
- **Pain Points**: Manual testing is time-consuming and unreliable
- **Needs**: Automated testing, performance metrics, version control

#### 2. Product Managers
- **Goals**: Ensure AI features meet quality standards
- **Pain Points**: No visibility into prompt performance
- **Needs**: Clear metrics, progress tracking, quality assurance

#### 3. QA Engineers
- **Goals**: Validate AI behavior before release
- **Pain Points**: Difficult to create comprehensive test cases
- **Needs**: Systematic testing, edge case coverage, regression testing

### Core Features

#### Dataset Management
- Upload JSONL files with `label` (boolean) and `messageContent` (string)
- View and paginate through datasets and individual messages
- Secure deletion with proper data cleanup
- Support for datasets up to 10,000 messages

#### Prompt Management
- Template system with `{{messageContent}}` placeholder substitution
- Configurable LLM parameters: temperature (default 0.3), topP (default 0.2), maxTokens, stopSequences
- Output parsing via configurable opening/closing tags (e.g., `<result>true</result>`)
- Versioning system - editing creates new version with parent reference
- Dynamic model loading from bedrock-wrapper (no hardcoded model lists)

#### Evaluation Engine
- Asynchronous processing with real-time progress tracking via SSE
- Configurable concurrent LLM request limits (env: `MAX_CONCURRENT_LLM_REQUESTS`)
- Automatic retry logic with exponential backoff (3 attempts default)
- Response time tracking per message
- Error handling with graceful degradation

#### Results Analysis
- **Metrics**: Accuracy, Precision, Recall, F1 Score
- **Detailed Results**: Individual message outcomes with full LLM responses
- **Performance Data**: Response times and error statistics
- **Real-time Progress**: Live updates during evaluation execution

---

## Database Schema

```sql
-- Core Tables
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE datasets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE dataset_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER NOT NULL,
    messageContent TEXT NOT NULL,
    label BOOLEAN NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id)
);

CREATE TABLE prompts (
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
);

CREATE TABLE evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_id INTEGER NOT NULL,
    dataset_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending', -- pending, running, completed, failed, paused
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
);

CREATE TABLE evaluation_results (
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
);
```

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout  
- `GET /api/auth/me` - Get current user

### Configuration
- `GET /api/config` - Get app configuration
- `GET /api/config/models` - Get available models from bedrock-wrapper (dynamic)

### Datasets
- `GET /api/datasets` - List datasets (paginated)
- `POST /api/datasets` - Create dataset with JSONL upload
- `GET /api/datasets/:id` - Get dataset details
- `DELETE /api/datasets/:id` - Delete dataset
- `GET /api/datasets/:id/messages` - Get dataset messages (paginated)
- `POST /api/datasets/:id/messages` - Add individual message
- `PUT /api/datasets/:id/messages/:messageId` - Update message
- `DELETE /api/datasets/:id/messages/:messageId` - Delete message

### Prompts
- `GET /api/prompts` - List prompts (paginated)
- `POST /api/prompts` - Create new prompt
- `GET /api/prompts/:id` - Get prompt details
- `PUT /api/prompts/:id` - Update prompt (creates new version)
- `PATCH /api/prompts/:id/name` - Update prompt name only
- `DELETE /api/prompts/:id` - Delete prompt (only if no evaluations)

### Evaluations
- `GET /api/evaluations` - List evaluations (paginated)
- `POST /api/evaluations` - Create evaluation
- `GET /api/evaluations/:id` - Get evaluation details
- `PATCH /api/evaluations/:id/name` - Update evaluation name
- `GET /api/evaluations/:id/status` - Validate evaluation status
- `POST /api/evaluations/:id/start` - Start evaluation
- `POST /api/evaluations/:id/stop` - Pause evaluation
- `POST /api/evaluations/:id/reset` - Reset evaluation
- `POST /api/evaluations/:id/resume` - Resume paused evaluation
- `POST /api/evaluations/:id/retry-errors` - Retry failed messages
- `POST /api/evaluations/:id/rerun` - Rerun entire evaluation
- `GET /api/evaluations/:id/results` - Get detailed results (paginated)
- `GET /api/evaluations/:id/stats` - Get evaluation metrics summary
- `GET /api/evaluations/:id/stream` - SSE endpoint for real-time progress
- `DELETE /api/evaluations/:id` - Delete evaluation

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

---

## Real-time Architecture & State Management

### Server-Sent Events (SSE)
- **SSE Manager** (`server/services/sseManager.js`) - Manages real-time connections
- **Evaluation Streaming** - Live progress updates during LLM evaluation execution
- **Connection Management** - Per-evaluation SSE connections with automatic cleanup
- **Progress Events** - Evaluation status, LLM call progress, completion notifications

### Frontend State (Pinia Stores)
- `auth.js` - User authentication and session management
- `datasets.js` - Dataset CRUD operations and message management
- `prompts.js` - Prompt templates with versioning support
- `evaluations.js` - Evaluation execution and real-time progress tracking

### Database Queue System
- **DB Queue** (`server/utils/dbQueue.js`) - Serializes database operations to prevent concurrency issues
- **Concurrent LLM Processing** - Multiple LLM requests with centralized result storage
- **Transaction Safety** - Ensures data consistency during concurrent evaluation operations

---

## Performance & Security Requirements

### Performance Requirements
- Support datasets up to 10,000 messages
- Process evaluations at 5+ messages per second
- Page load times under 1 second
- API response times under 200ms (excluding LLM calls)
- Handle 100+ concurrent users
- Support 1000+ stored evaluations

### Security Measures
- **Authentication**: JWT tokens with 24-hour expiration
- **Password Security**: bcrypt hashing with salt rounds
- **Input Validation**: express-validator on all endpoints
- **SQL Injection Prevention**: Parameterized queries throughout
- **XSS Protection**: Content-Security-Policy headers
- **File Upload Security**: JSONL validation, 50MB limit
- **Environment Security**: All secrets in environment variables

### Monitoring & Logging
- **Application Logs**: Winston with daily rotation
- **Error Tracking**: Centralized error handler with stack traces
- **LLM Call Logs**: Separate log file for debugging LLM interactions
- **Performance Metrics**: Response times tracked per evaluation
- **Health Check**: `GET /api/health` endpoint for uptime monitoring

---

## Data Formats & Examples

### JSONL Dataset Format
```json
{"messageContent": "Hi, when will my order arrive?", "label": true}
{"messageContent": "Payment processed for $49.99", "label": false}
{"messageContent": "Can you help me with my account?", "label": true}
```

### Prompt Template Example
```
Classify the following message as either conversational (true) or transactional (false).

Message: {{messageContent}}

Respond with: <is-conversational>true</is-conversational> or <is-conversational>false</is-conversational>
```

### Environment Configuration
```bash
# Server Configuration
PORT=4444
CLIENT_PORT=5173
NODE_ENV=development

# Database
DB_PATH=./database.sqlite

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# File Upload
MAX_FILE_SIZE_MB=150

# LLM Configuration  
MAX_CONCURRENT_LLM_REQUESTS=30
LLM_REQUEST_RETRY_ATTEMPTS=3
LLM_REQUEST_RETRY_DELAY_MS=500
LLM_ERROR_DELAY_MS=5000
EVALUATION_CONCURRENCY_RATIO=0.8

# AWS Configuration (for bedrock-wrapper)
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Logging
LOG_LEVEL=debug
LOG_FILE_PATH=./logs/app.log

# Pagination
DEFAULT_PAGE_SIZE=50
MAX_PAGE_SIZE=100
```
---

## Glossary
- **LLM**: Large Language Model
- **Prompt**: Instructions given to an LLM
- **Evaluation**: Testing a prompt against a dataset
- **F1 Score**: Measure of classification accuracy (harmonic mean of precision and recall)
- **JSONL**: JSON Lines format (one JSON object per line)
- **SSE**: Server-Sent Events for real-time updates
- **Template Placeholder**: `{{messageContent}}` substitution marker in prompts