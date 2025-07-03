# Task Management Backend (GTD & Batching)

A NestJS backend implementing Getting Things Done (GTD) principles with AI-powered task batching, dependency inference, and prioritization.

## Features

- **AI-Powered Task Management**
  - Automatic task grouping/batching using similarity detection
  - Hidden task dependency inference
  - Smart prioritization based on deadlines and context
  - Pomodoro schedule generation

- **Core Functionality**
  - User authentication (JWT)
  - Task CRUD operations
  - GTD workflow implementation
  - Batch processing of similar tasks

- **Technical Highlights**
  - Integration with OpenRouter AI (Gemini 2.0 Flash)
  - Custom sequence prediction for task ordering
  - Fallback mechanisms for all AI operations
  - TypeORM for database operations

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/RanaRomdhane/task-management-gtd.git
   cd task-management-gtd