import { apiClient } from "./client"

export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  DONE = "done",
  BLOCKED = "blocked",
  ARCHIVED = "archived",
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum TaskType {
  WORK = "work",
  PERSONAL = "personal",
  LEARNING = "learning",
  ADMIN = "admin",
  MEETING = "meeting",
  CREATIVE = "creative",
  COMMUNICATION = "communication",
  OTHER = "other",
}

export interface Task {
  id: number
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  type: TaskType
  dueDate?: string
  estimatedDuration?: number
  timeSpent?: number
  isRecurring: boolean
  recurrencePattern?: string
  isBatchable: boolean
  isBatched: boolean
  batchId?: string
  userId: number
  groupId?: number
  group?: TaskGroup
  dependencies?: Task[]
  createdAt: string
  updatedAt: string
  pomodoroCount?: number
}

export interface TaskGroup {
  id: number
  name: string
  description?: string
  isBatch: boolean
  tasks: Task[]
  userId: number
  createdAt: string
  updatedAt: string
}

export interface CreateTaskRequest {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  type: TaskType
  dueDate?: string
  estimatedDuration?: number
  isRecurring?: boolean
  recurrencePattern?: string
  isBatchable?: boolean
  dependencyIds?: number[]
}

export interface CreateTaskGroupRequest {
  name: string
  description?: string
  isBatch?: boolean
}

export const tasksApi = {
  // Tasks
  getTasks: async (): Promise<Task[]> => {
    const response = await apiClient.get("/tasks")
    return response.data
  },

  getTask: async (id: number): Promise<Task> => {
    const response = await apiClient.get(`/tasks/${id}`)
    return response.data
  },

  createTask: async (data: CreateTaskRequest): Promise<Task> => {
    const response = await apiClient.post("/tasks", data)
    return response.data
  },

  updateTask: async (id: number, data: Partial<CreateTaskRequest>): Promise<Task> => {
    const response = await apiClient.put(`/tasks/${id}`, data)
    return response.data
  },

  deleteTask: async (id: number): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`)
  },

  changeTaskStatus: async (id: number, status: TaskStatus): Promise<Task> => {
    const response = await apiClient.put(`/tasks/${id}/status/${status}`)
    return response.data
  },

  // AI Features
  batchSimilarTasks: async (): Promise<TaskGroup[]> => {
    const response = await apiClient.post("/tasks/batch")
    return response.data
  },

  inferDependencies: async (id: number): Promise<Task> => {
    const response = await apiClient.post(`/tasks/${id}/infer-dependencies`)
    return response.data
  },

  prioritizeTasks: async (): Promise<Task[]> => {
    const response = await apiClient.post("/tasks/prioritize")
    return response.data
  },

  getPomodoroSchedule: async (): Promise<Task[]> => {
    const response = await apiClient.get("/tasks/schedule/pomodoro")
    return response.data
  },

  // Task Groups
  getTaskGroups: async (): Promise<TaskGroup[]> => {
    const response = await apiClient.get("/tasks/groups")
    return response.data
  },

  deleteTaskGroup: async (groupId: number): Promise<void> => {
    const response = await apiClient.delete(`/tasks/groups/${groupId}`);
    return response.data;
  },

  createTaskGroup: async (data: CreateTaskGroupRequest): Promise<TaskGroup> => {
    const response = await apiClient.post("/tasks/groups", data)
    return response.data
  },

  addTaskToGroup: async (taskId: number, groupId: number): Promise<Task> => {
    const response = await apiClient.put(`/tasks/${taskId}/groups/${groupId}`)
    return response.data
  },

  removeTaskFromGroup: async (taskId: number): Promise<Task> => {
    const response = await apiClient.delete(`/tasks/${taskId}/groups`)
    return response.data
  },
}
