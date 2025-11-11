# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

This is a full-stack prompt evaluation platform with a clear separation between client and server:

- **Backend**: Express.js server at `server/` with modular structure using feature-based modules (`auth`, `datasets`, `prompts`, `evaluations`, `dashboard`)
- **Frontend**: Vue.js 3 SPA at `client/` using Vite, Tailwind CSS, and Pinia for state management
- **Database**: SQLite with setup scripts in `server/scripts/`
- **LLM Integration**: AWS Bedrock via bedrock-wrapper service with dynamic model loading

### Key Modules
- `server/modules/auth/` - JWT authentication system
- `server/modules/datasets/` - JSONL dataset upload and management
- `server/modules/prompts/` - Prompt template creation and versioning
- `server/routes/evaluations.js` - LLM prompt evaluation engine with real-time progress tracking
- `client/src/stores/` - Pinia stores for state management (auth, datasets, evaluations, prompts)

### Core Data Flow
1. **Datasets**: Upload JSONL files with labeled data (messageContent + label boolean)
2. **Prompts**: Create templates with `{{messageContent}}` placeholders and output tags
3. **Evaluations**: Execute prompts against datasets using configurable LLM parameters
4. **Real-time Updates**: SSE connections provide live progress during evaluation execution
5. **Results Analysis**: Accuracy metrics, response times, and error handling with retry capabilities

### LLM Integration Architecture
- **Dynamic Model Loading**: Models fetched from bedrock-wrapper at runtime via `/api/config/models`
- **Concurrent Processing**: Configurable concurrent LLM request limits with queue management
- **Error Resilience**: LLM error delays, retry mechanisms, and graceful degradation
- **Progress Tracking**: Real-time SSE updates for evaluation progress and LLM call status

## Development Commands

### Full Development Setup
```bash
npm run setup-db     # Initialize database schema
npm start            # Starts both backend and frontend with automatic port cleanup
```

### Development Ports (configurable via .env)
- Backend: PORT (default: 4444)
- Frontend: CLIENT_PORT (default: 5173)
- Production: Single server on PORT

### Testing
```bash
npm test            # Run all tests with vitest
npm run test:ui     # Run tests with UI
npm run test:coverage # Generate coverage reports
cd client && npm test # Frontend-specific tests
```

### Build
```bash
npm run build       # Full production build (outputs to dist/)
```

### Production Build Process
The build command creates a complete production bundle in `dist/` directory:
- **Frontend**: Built with Vite (tree shaking, optimization) → `dist/client/`
- **Server**: Copied to `dist/server/`
- **Environment**: Optimized `.env` with development-only variables removed
- **Dependencies**: Production-ready `package.json`

### Production Deployment
```bash
# Build the production bundle
npm run build

# Deploy from dist directory
cd dist
npm install --omit=dev
npm start
```

Production server features:
- Automatic port cleanup (kills processes on port 4444)
- Serves built frontend from `dist/client/`
- Graceful shutdown handling
- Development-only environment variables automatically excluded

### Single Test Execution
```bash
# Run specific test file
npx vitest run path/to/test.spec.js

# Run tests matching pattern
npx vitest run --reporter=verbose --grep="pattern"
```

## Database Operations

### Database Scripts
- `server/scripts/setup-database.js` - Initialize database schema (required for fresh setup)
- `server/scripts/seed-test-user.js` - Create test user for development (optional)

The SQLite database file is `database.sqlite` in the project root.

## Key Configuration Files

- `server/config/database.js` - Database connection setup
- `client/vite.config.js` - Frontend build configuration  
- `vitest.config.js` - Test configuration with path aliases (`@server` and `@` for server code)
- AWS credentials required for Bedrock LLM integration

## State Management & Real-time Updates

### Frontend State (Pinia Stores)
- `auth.js` - User authentication and session management
- `datasets.js` - Dataset CRUD operations and message management
- `prompts.js` - Prompt templates with versioning support
- `evaluations.js` - Evaluation execution and real-time progress tracking

### Real-time Architecture
- **SSE Manager** (`server/services/sseManager.js`) - Manages Server-Sent Events for live updates
- **Evaluation Streaming** - Real-time progress updates during LLM evaluation execution
- **Connection Management** - Per-evaluation SSE connections with automatic cleanup
- **Progress Events** - Evaluation status, LLM call progress, completion notifications

### Database Queue System
- **DB Queue** (`server/utils/dbQueue.js`) - Serializes database operations to prevent concurrency issues
- **Concurrent LLM Processing** - Multiple LLM requests with centralized result storage
- **Transaction Safety** - Ensures data consistency during concurrent evaluation operations

## Prompt Evaluation Workflow

### Template System
- Prompts use `{{messageContent}}` placeholders for dataset message substitution
- Output parsing via configurable opening/closing tags (e.g., `<result>true</result>`)
- Model parameters: temperature (default 0.3), topP (default 0.2), maxTokens, stopSequences

### Evaluation Engine
- **Concurrent Processing**: Configurable max concurrent LLM requests (env: `MAX_CONCURRENT_LLM_REQUESTS`)
- **Error Handling**: LLM error delays, retry attempts, and graceful failure recovery
- **Progress Tracking**: Real-time SSE updates for evaluation progress and active LLM calls
- **Result Storage**: Individual message results with response times and error details

### Model Integration
- **Dynamic Model Loading**: Models fetched from bedrock-wrapper via `/api/config/models`
- **No Hardcoded Mappings**: Model list automatically updates when new models added to bedrock-wrapper
- **Fallback Support**: Client-side fallback models if API unavailable

## Data Management & Deletion

**Important**: This system uses hard deletes, not soft deletes. When users press "delete" buttons:
- Records are permanently removed from the database using `DELETE FROM table`
- Related data is also cleaned up (e.g., deleting a dataset also deletes its messages)
- No `deleted_at` columns exist in the database schema
- No recovery mechanism exists for deleted data

### Fresh Database Setup
For new installations, simply run:
```bash
npm run setup-db     # Creates fresh database with hard delete schema
```

## Database Architecture & Constraints

### Key Relationships
- **Datasets → Messages**: One-to-many (cascade delete)
- **Evaluations → Results**: One-to-many (cascade delete)  
- **Prompts → Versions**: Self-referential via `parent_prompt_id`
- **Users → All Resources**: Foreign key ownership

### Important Constraints
- Datasets cannot be deleted if used in evaluations
- Prompts cannot be deleted if used in evaluations or have child versions
- Evaluations cannot be deleted while in "running" status
- Dataset names must be unique per user
- Username must be unique across all users

### Database Operations Pattern
All services follow this pattern:
```javascript
// Check ownership/permissions
const resource = await this.getResourceById(id);
if (resource.created_by !== userId) {
  throw new AppError('Not authorized', 403);
}

// Check references before deletion
const refCount = await get('SELECT COUNT(*) as count FROM references WHERE resource_id = ?', [id]);
if (refCount.count > 0) {
  throw new AppError('Cannot delete referenced resource', 400);
}

// Perform hard delete
await run('DELETE FROM table WHERE id = ?', [id]);
```

## Concurrent Processing Architecture

### Database Queue System
- `server/utils/dbQueue.js` serializes all database writes to prevent race conditions
- Multiple LLM requests can run concurrently but database updates are queued
- Use `dbQueue.executeWrite()` for all database modifications during evaluations

### Environment Configuration for Concurrency
```bash
MAX_CONCURRENT_LLM_REQUESTS=15          # Total LLM request limit (default: 15)
EVALUATION_CONCURRENCY_RATIO=0.8        # Portion reserved for evaluations
LLM_REQUEST_RETRY_ATTEMPTS=3             # Retry failed LLM calls
LLM_REQUEST_RETRY_DELAY_MS=500           # Delay between retry attempts
LLM_ERROR_DELAY_MS=5000                  # Delay after LLM errors
```

### SSE (Server-Sent Events) Real-time Updates
- `server/services/sseManager.js` manages connections per evaluation
- Events: `evaluation_update`, `evaluation_complete`, `llm_call_start`, `llm_call_complete`
- Connections auto-cleanup when evaluations complete
- Client reconnects automatically on connection loss

## Error Handling Patterns

### Service Layer Error Handling
All services use consistent error patterns:
```javascript
// Use AppError for business logic errors
throw new AppError('Resource not found', 404);

// Database errors bubble up naturally
const result = await db.operation();
if (!result) {
  throw new AppError('Operation failed', 500);
}
```

### LLM Error Resilience
- Automatic retries with exponential backoff
- Rate limit detection and adaptive delays
- Error classification (temporary vs permanent failures)
- Graceful degradation for evaluation continuation

## Testing Architecture

### Test Structure
```bash
# Run all tests (backend + frontend)
npm run test:all

# Backend only (vitest)
npm test

# Single test file
npx vitest run server/modules/auth/auth.service.test.js

# Pattern matching
npx vitest run --grep="should delete dataset"

# Watch mode during development
npx vitest --watch
```

### Mock Patterns
Tests use comprehensive mocking for:
- Database operations (sqlite3 mocked)
- LLM service calls (bedrock-wrapper mocked)
- File system operations (multer/uploads mocked)
- Time-sensitive operations (Date.now mocked)

## API Response Patterns

### Consistent Response Structure
```javascript
// Success responses
{ data: {...}, pagination: {...} }

// Error responses  
{ error: "Message", statusCode: 400 }

// Paginated responses
{
  [resource]: [...],
  pagination: {
    page: 1,
    pageSize: 50, 
    total: 250,
    totalPages: 5
  }
}
```

### Authentication Flow
- JWT tokens in `Authorization: Bearer <token>` header
- Middleware `requireAuth` validates and injects `req.user`
- Token expiration handled gracefully with 401 responses
- Frontend auto-redirects to login on token expiry