from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

class TaskPriority(str, Enum):
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    CRITICAL = 'critical'

class TaskStatus(str, Enum):
    TODO = 'todo'
    IN_PROGRESS = 'in_progress'
    DONE = 'done'
    BLOCKED = 'blocked'
    ARCHIVED = 'archived'

class TaskType(str, Enum):
    WORK = 'work'
    PERSONAL = 'personal'
    LEARNING = 'learning'
    ADMIN = 'admin'
    MEETING = 'meeting'
    CREATIVE = 'creative'
    COMMUNICATION = 'communication'
    OTHER = 'other'

class Task(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    type: TaskType
    priority: TaskPriority
    status: TaskStatus
    dueDate: Optional[str] = None
    estimatedDuration: Optional[int] = None

class SimilarTaskGroup(BaseModel):
    name: str
    taskIds: List[int]

class InferredTask(BaseModel):
    title: str
    description: str
    type: TaskType
    priority: TaskPriority

class GroupTasksRequest(BaseModel):
    tasks: List[Task]

class InferDependenciesRequest(BaseModel):
    task: Task

class PrioritizeRequest(BaseModel):
    tasks: List[Task]

class PomodoroRequest(BaseModel):
    tasks: List[Task]