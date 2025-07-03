## AI Service Features

### Task Batching Logic
1. Groups tasks by:
   - Type similarity (WORK/ADMIN)
   - Common keywords in titles
2. Fallback: Simple type-based grouping

### Dependency Inference
Triggers when:
- Task contains "prepare", "create", or "build"
- No subtasks are defined