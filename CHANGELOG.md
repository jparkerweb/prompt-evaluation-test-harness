# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-08-12
### ✨ Added
- Updated to use Bedrock Wrapper v2.5.0
- Support for the AWS Bedrock `Converse` API

### 🔄 Changed
- Removed "soft deletes" from DB operations

---

## [1.0.1] - 2025-08-06
### Added
- Updated to use Bedrock Wrapper v2.4.5
- Support for OpenAI GPT-OSS models on AWS Bedrock

---

## [1.0.0] - 2025-08-03
### ✨ Added
#### Core Features
- **Dataset Management**: Upload and manage labeled datasets in JSONL format with messageContent and boolean labels
- **Prompt Templates**: Create and version prompt templates with `{{messageContent}}` placeholders and configurable output tags
- **LLM Evaluation Engine**: Execute prompts against datasets with real-time progress tracking via Server-Sent Events
- **Comprehensive Metrics**: View detailed accuracy, precision, recall, and F1 score analytics for evaluation results
- **Team Collaboration**: Multi-user support with JWT authentication and secure data management

#### Technical Infrastructure
- **Full-Stack Architecture**: Express.js backend with Vue.js 3 frontend and SQLite database
- **AWS Bedrock Integration**: Dynamic model loading via bedrock-wrapper service with configurable parameters
- **Real-time Updates**: SSE-based live progress tracking during evaluation execution
- **Concurrent Processing**: Configurable concurrent LLM request limits with queue management and error resilience
- **Database Queue System**: Serialized database operations to prevent concurrency issues during evaluations

#### User Interface
- **Modern UI**: Vue.js 3 with Tailwind CSS, Headless UI components, and Heroicons
- **Responsive Design**: Mobile-friendly interface with dark/light theme support
- **Interactive Components**: Real-time evaluation progress, filterable data tables, and detailed result views
- **State Management**: Pinia stores for centralized state management (auth, datasets, prompts, evaluations)

#### Development & Operations
- **Development Environment**: Hot-reload development setup with concurrent frontend/backend servers
- **Testing Suite**: Vitest-based testing with UI and coverage reporting
- **Production Build**: Optimized Vite build with tree shaking and manual chunking
- **Database Migrations**: Automated schema setup and migration scripts
- **Logging & Monitoring**: Winston-based logging with configurable levels

#### Configuration & Deployment
- **Environment Configuration**: Flexible .env-based configuration for ports, database paths, and AWS credentials
- **Production Ready**: Single-server production mode serving built frontend assets
- **AWS Integration**: Bedrock model access with fallback support and error handling
- **Database Flexibility**: SQLite with configurable database path for different environments

### Technical Details
- **Backend**: Node.js 18+, Express.js, SQLite3, JWT Authentication, AWS Bedrock
- **Frontend**: Vue.js 3, Vite, Tailwind CSS, Pinia, Vue Router
- **Testing**: Vitest with Happy DOM environment
- **Build Tools**: Vite with optimized production builds and asset management