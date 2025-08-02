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

export interface UpdateTaskGroupRequest {
  name?: string
  description?: string
  isBatch?: boolean
}

export const tasksApi = {
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

  getTaskGroups: async (): Promise<TaskGroup[]> => {
    try {
      const response = await apiClient.get("/tasks/groups")
      const data = response.data
      
      if (!data) {
        console.warn('No data received from server')
        return []
      }

      const groups = Array.isArray(data) ? data : []
      
      return groups.map(group => ({
        ...group,
        tasks: Array.isArray(group.tasks) ? group.tasks : []
      }))
      
    } catch (error: any) {
      console.error('Error fetching task groups:', error)
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to fetch task groups'
      )
    }
  },

  deleteTaskGroup: async (groupId: number): Promise<void> => {
    try {
      if (!groupId || isNaN(groupId)) {
        throw new Error('Invalid group ID')
      }
      await apiClient.delete(`/tasks/groups/${groupId}`)
    } catch (error: any) {
      console.error('Error deleting group:', error)
      throw error
    }
  },

  updateTaskGroup: async (id: number, data: UpdateTaskGroupRequest): Promise<TaskGroup> => {
    try {
      if (!id || isNaN(id) || id <= 0) {
        throw new Error('Invalid group ID')
      }

      const cleanData: UpdateTaskGroupRequest = {}
      
      if (data.name !== undefined && data.name.trim() !== '') {
        cleanData.name = data.name.trim()
      }
      
      if (data.description !== undefined) {
        cleanData.description = data.description.trim() || undefined
      }
      
      if (data.isBatch !== undefined) {
        cleanData.isBatch = Boolean(data.isBatch)
      }

      console.log('Updating group with clean data:', { id, cleanData })
      
      const response = await apiClient.put(`/tasks/groups/${id}`, cleanData)
      return response.data
    } catch (error: any) {
      console.error('Error updating task group:', error)
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Invalid data provided'
        throw new Error(`Bad Request: ${errorMessage}`)
      }
      throw error
    }
  },

  createTaskGroup: async (data: CreateTaskGroupRequest): Promise<TaskGroup> => {
    try {
      const cleanData: CreateTaskGroupRequest = {
        name: data.name.trim(),
        isBatch: Boolean(data.isBatch || false)
      }
      
      if (data.description !== undefined && data.description.trim() !== '') {
        cleanData.description = data.description.trim()
      }

      console.log('Creating group with clean data:', cleanData)
      
      const response = await apiClient.post("/tasks/groups", cleanData)
      return response.data
    } catch (error: any) {
      console.error('Error creating task group:', error)
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Invalid data provided'
        throw new Error(`Bad Request: ${errorMessage}`)
      }
      throw error
    }
  },

  addTaskToGroup: async (taskId: number, groupId: number): Promise<Task> => {
    try {
      if (!taskId || isNaN(taskId) || taskId <= 0) {
        throw new Error('Invalid task ID')
      }
      if (!groupId || isNaN(groupId) || groupId <= 0) {
        throw new Error('Invalid group ID')
      }
      
      console.log(`Adding task ${taskId} to group ${groupId}`)
      
      const response = await apiClient.put(`/tasks/${taskId}/groups/${groupId}`)
      return response.data
    } catch (error: any) {
      console.error(`Error adding task ${taskId} to group ${groupId}:`, error)
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Invalid request'
        throw new Error(`Bad Request: ${errorMessage}`)
      }
      throw error
    }
  },

  removeTaskFromGroup: async (taskId: number): Promise<Task> => {
    try {
      if (!taskId || isNaN(taskId) || taskId <= 0) {
        throw new Error('Invalid task ID')
      }
      
      console.log(`Removing task ${taskId} from group`)
      
      const response = await apiClient.delete(`/tasks/${taskId}/groups`)
      return response.data
    } catch (error: any) {
      console.error('Error removing task from group:', error)
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Invalid request'
        throw new Error(`Bad Request: ${errorMessage}`)
      }
      throw error
    }
  },
}