import { apiClient } from "./client";

export interface CalendarEvent {
  id: number;
  googleEventId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  isAllDay: boolean;
  provider: 'google' | 'outlook' | 'other';
  userId: number;
  taskId?: number;
  task?: {
    id: number;
    title: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'todo' | 'in_progress' | 'done';
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  startTime: string | Date;
  endTime: string | Date;
  location?: string;
  isAllDay?: boolean;
  taskId?: number;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  startTime?: string | Date;
  endTime?: string | Date;
  location?: string;
  isAllDay?: boolean;
}

export interface CalendarConnectionStatus {
  connected: boolean;
  lastSynced?: string;
}

export interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  deleted: number;
  message: string;
}

export interface AuthUrlResponse {
  authUrl: string;
  state?: string;
}

export interface CallbackResult {
  success: boolean;
  message: string;
  userId?: number;
}

export const calendarApi = {
  getAuthUrl: async (): Promise<AuthUrlResponse> => {
    try {
      const response = await apiClient.get("/calendar/auth-url");
      return response.data;
    } catch (error: any) {
      console.error('Auth URL error:', error.response?.data || error.message);
      throw new Error(`Failed to get auth URL: ${error.response?.data?.message || error.message}`);
    }
  },

  handleCallback: async (code: string): Promise<CallbackResult> => {
    try {
      const response = await apiClient.post("/calendar/callback", { code });
      return response.data;
    } catch (error: any) {
      console.error('Callback error:', error.response?.data || error.message);
      throw new Error(`Failed to handle callback: ${error.response?.data?.message || error.message}`);
    }
  },

  disconnect: async (): Promise<CallbackResult> => {
    try {
      const response = await apiClient.delete("/calendar/disconnect");
      return response.data;
    } catch (error: any) {
      console.error('Disconnect error:', error.response?.data || error.message);
      throw new Error(`Failed to disconnect: ${error.response?.data?.message || error.message}`);
    }
  },

  getConnectionStatus: async (): Promise<CalendarConnectionStatus> => {
    try {
      const response = await apiClient.get("/calendar/status");
      return response.data;
    } catch (error) {
      console.error('Status check failed:', error);
      return { connected: false };
    }
  },

  syncEvents: async (): Promise<SyncResult> => {
    try {
      const response = await apiClient.post("/calendar/sync");
      return response.data;
    } catch (error: any) {
      console.error('Sync error:', error.response?.data || error.message);
      throw new Error(`Failed to sync events: ${error.response?.data?.message || error.message}`);
    }
  },

  // FIXED: getEvents with proper date handling and error reporting
  getEvents: async (options?: {
    startDate?: string | Date;
    endDate?: string | Date;
    limit?: number;
  }): Promise<CalendarEvent[]> => {
    try {
      const params = new URLSearchParams();
      
      if (options?.startDate) {
        let startDateStr: string;
        if (options.startDate instanceof Date) {
          // Ensure the date is valid
          if (isNaN(options.startDate.getTime())) {
            throw new Error('Invalid startDate provided');
          }
          startDateStr = options.startDate.toISOString();
        } else {
          // Validate string date
          const parsedDate = new Date(options.startDate);
          if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid startDate string provided');
          }
          startDateStr = parsedDate.toISOString();
        }
        params.append('startDate', startDateStr);
      }
      
      if (options?.endDate) {
        let endDateStr: string;
        if (options.endDate instanceof Date) {
          if (isNaN(options.endDate.getTime())) {
            throw new Error('Invalid endDate provided');
          }
          endDateStr = options.endDate.toISOString();
        } else {
          const parsedDate = new Date(options.endDate);
          if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid endDate string provided');
          }
          endDateStr = parsedDate.toISOString();
        }
        params.append('endDate', endDateStr);
      }
      
      if (options?.limit && options.limit > 0) {
        params.append('limit', options.limit.toString());
      }
      
      const queryString = params.toString();
      const url = `/calendar/events${queryString ? `?${queryString}` : ''}`;
      
      console.log('Fetching events with URL:', url);
      const response = await apiClient.get(url);
      return response.data;
    } catch (error: any) {
      console.error('Get events error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        params: error.config?.params
      });
      
      // Provide more specific error messages
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Bad request - invalid parameters';
        throw new Error(`Failed to get events: ${errorMessage}`);
      } else if (error.response?.status === 401) {
        throw new Error('Authentication required - please log in again');
      } else if (error.response?.status === 403) {
        throw new Error('Calendar not connected - please connect your Google Calendar');
      } else {
        throw new Error(`Failed to get events: ${error.response?.data?.message || error.message}`);
      }
    }
  },

  createEvent: async (data: CreateEventRequest): Promise<CalendarEvent> => {
    try {
      console.log('Calendar API - Input data:', data)
      
      // Send data as-is since we're now properly formatting dates in the dialog
      const response = await apiClient.post("/calendar/events", data);
      console.log('Calendar API - Success:', response.data)
      return response.data;
    } catch (error: any) {
      console.error('Calendar API - Create event failed:', {
        input: data,
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      
      // Extract validation errors if available
      if (error.response?.status === 400 && error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error(
        error.response?.data?.message || 
        error.message ||
        'Failed to create event. Please check your input.'
      );
    }
  },

  updateEvent: async (id: number, data: UpdateEventRequest): Promise<CalendarEvent> => {
    try {
      const payload = { ...data };
      if (data.startTime) {
        payload.startTime = data.startTime instanceof Date 
          ? data.startTime.toISOString() 
          : new Date(data.startTime).toISOString();
      }
      if (data.endTime) {
        payload.endTime = data.endTime instanceof Date 
          ? data.endTime.toISOString() 
          : new Date(data.endTime).toISOString();
      }
      
      const response = await apiClient.put(`/calendar/events/${id}`, payload);
      return response.data;
    } catch (error: any) {
      console.error('Update event error:', error.response?.data || error.message);
      throw new Error(`Failed to update event: ${error.response?.data?.message || error.message}`);
    }
  },

  deleteEvent: async (id: number): Promise<CallbackResult> => {
    try {
      const response = await apiClient.delete(`/calendar/events/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Delete event error:', error.response?.data || error.message);
      throw new Error(`Failed to delete event: ${error.response?.data?.message || error.message}`);
    }
  },

  createEventFromTask: async (taskId: number): Promise<CalendarEvent> => {
    try {
      const response = await apiClient.post(`/calendar/events/from-task/${taskId}`);
      return response.data;
    } catch (error: any) {
      console.error('Create event from task error:', error.response?.data || error.message);
      throw new Error(`Failed to create event from task: ${error.response?.data?.message || error.message}`);
    }
  },

  getTasksWithEvents: async (): Promise<Array<{
    taskId: number;
    eventId: number;
    title: string;
    startTime: string;
  }>> => {
    try {
      const response = await apiClient.get("/calendar/tasks-with-events");
      return response.data;
    } catch (error: any) {
      console.error('Get tasks with events error:', error.response?.data || error.message);
      throw new Error(`Failed to get tasks with events: ${error.response?.data?.message || error.message}`);
    }
  },
};