# Task Management API v1.0

## Base URL
`https://api.yourdomain.com/v1`

## Authentication
All endpoints except `/auth/*` require JWT in `Authorization: Bearer <token>`

---

## Auth Endpoints

### Register User
`POST /auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "P@ssw0rd123",
  "firstName": "John",
  "lastName": "Doe"
}
Success Response (201):

json
{
  "access_token": "eyJhbGci...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
Task Endpoints
Create Task
POST /tasks

Request:

json
{
  "title": "Complete project docs",
  "description": "All API documentation",
  "type": "WORK",
  "priority": "HIGH",
  "dueDate": "2024-12-31"
}
Response (201):

json
{
  "id": 1,
  "status": "TODO",
  "dependencies": [
    {
      "id": 2,
      "title": "Research documentation tools"
    }
  ]
}
Batch Similar Tasks
POST /tasks/batch

Response (200):

json
{
  "batchedGroups": [
    {
      "name": "Documentation Tasks",
      "tasks": [1, 3, 7],
      "estimatedTimeSaved": "2.5 hours"
    }
  ]
}
Get Pomodoro Schedule
GET /tasks/schedule/pomodoro

Response (200):

json
[
  {
    "taskId": 1,
    "title": "Write spec",
    "pomodoroCount": 3,
    "sequence": 1,
    "type": "WORK"
  },
  {
    "taskId": 3,
    "title": "Review PR",
    "pomodoroCount": 1,
    "sequence": 2,
    "type": "REVIEW"
  }
]
Task Group Endpoints
Create Group
POST /tasks/groups

Request:

json
{
  "name": "Urgent Contracts",
  "taskIds": [1, 5, 9]
}
Response (201):

json
{
  "id": 1,
  "completionPercentage": 0
}
AI Service Endpoints
Endpoint	Method	Description	AI Model Used
/tasks/batch	POST	Group similar tasks	Gemini-2.0 (Similarity Detection)
/tasks/:id/infer-dependencies	POST	Infer hidden subtasks	Gemini-2.0 (Dependency Chain)
/tasks/prioritize	POST	Reorder tasks by importance	Gemini-2.0 (Priority Scoring)
/tasks/schedule/pomodoro	GET	Generate work intervals	Gemini-2.0 (Time Estimation)
Error Responses
400 Bad Request:

json
{
  "statusCode": 400,
  "message": ["priority must be one of: LOW, MEDIUM, HIGH, CRITICAL"]
}
401 Unauthorized:

json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
500 AI Service Error:

json
{
  "statusCode": 503,
  "message": "AI service unavailable - using fallback logic"
}
## Rate Limits
- 100 requests/minute for authenticated users

- 10 requests/minute for auth endpoints

## Postman Collection link :  "https://ranaromdhane-8142697.postman.co/workspace/Rana-Romdhane's-Workspace~88ede262-8f89-4ac9-865a-6bceebbe421a/collection/45905016-ed0dea06-8418-4b5f-b3ca-674057250e3e?action=share&source=copy-link&creator=45905016"
