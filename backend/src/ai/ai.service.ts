import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Task } from '../tasks/entities/task.entity';
import { TaskPriority } from '../tasks/enums/task-priority.enum';

interface SimilarTaskGroup {
  name: string;
  taskIds: number[];
}

interface InferredTask {
  title: string;
  description: string;
  type: string;
  priority: TaskPriority;
}

@Injectable()
export class AiService {
  private readonly openRouterApiUrl: string;
  private readonly openRouterApiKey: string;
  private readonly modelName: string;

  constructor(private configService: ConfigService) {
    this.openRouterApiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    this.openRouterApiKey = this.configService.get<string>('OPENROUTER_API_KEY');
    this.modelName = 'google/gemini-2.0-flash-exp:free'; // Using the free Gemini Pro model
  }

  private async callGemini(prompt: string, systemMessage?: string): Promise<any> {
    const messages = [];
    
    if (systemMessage) {
      messages.push({
        role: "system",
        content: systemMessage
      });
    }
    
    messages.push({
      role: "user",
      content: prompt
    });
  
    try {
      const response = await axios.post(
        this.openRouterApiUrl,
        {
          model: this.modelName,
          messages,
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://yourdomain.com',
            'X-Title': 'Task Management AI',
          },
          timeout: 30000
        }
      );
  
      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response content');
      }

      try {
        
        const parsed = JSON.parse(content);
        return parsed;
      } catch (e) {
        
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }
        throw new Error('Invalid JSON response');
      }
    } catch (error) {
      console.error('API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw new Error('AI service unavailable');
    }
  }

  async groupSimilarTasks(tasks: Task[]): Promise<SimilarTaskGroup[]> {
    if (!tasks?.length) return [];
    
    try {
      const systemMessage = `You are a task grouping assistant. Analyze the following tasks and group them based on similarity in type, title, and description. 
        Return a JSON object with a "groups" field containing an array of group objects. Each group should have:
        - "name": string (descriptive name for the group)
        - "taskIds": number[] (array of task IDs in this group)`;
      
      const prompt = `Tasks to group: ${JSON.stringify(tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        type: task.type,
      })))}`;

      const response = await this.callGemini(prompt, systemMessage);
      return response.groups || this.fallbackGrouping(tasks);
    } catch (error) {
      console.error('Error grouping tasks with Gemini:', error);
      return this.fallbackGrouping(tasks);
    }
  }

  private fallbackGrouping(tasks: Task[]): SimilarTaskGroup[] {
    const groupsMap = new Map<string, number[]>();
    
    for (const task of tasks) {
      const key = task.type || 'miscellaneous';
      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key)?.push(task.id);
    }

    return Array.from(groupsMap.entries()).map(([name, taskIds]) => ({
      name: `${name} tasks batch`,
      taskIds,
    }));
  }

  async inferTaskDependencies(task: Task): Promise<InferredTask[]> {
    if (!task) return [];
    
    try {
      const systemMessage = `You are a task dependency analyzer. Analyze the following task and suggest 3-5 potential subtasks or dependencies that would be needed to complete it.
        Return a JSON object with a "dependencies" field containing an array of task objects. Each task should have:
        - "title": string
        - "description": string
        - "type": string
        - "priority": string (CRITICAL, HIGH, MEDIUM, LOW)`;
      
      const prompt = `Main task to analyze:
        Title: ${task.title}
        Description: ${task.description || 'No description'}
        Type: ${task.type || 'No type specified'}
        
        Suggest dependencies in the specified format.`;

      const response = await this.callGemini(prompt, systemMessage);
      return response.dependencies || this.fallbackDependencies(task);
    } catch (error) {
      console.error('Error inferring dependencies with Gemini:', error);
      return this.fallbackDependencies(task);
    }
  }
  
  private fallbackDependencies(task: Task): InferredTask[] {
    return [
      {
        title: `Research for ${task.title}`,
        description: `Initial research needed for ${task.title}`,
        type: 'research',
        priority: TaskPriority.MEDIUM
      },
      {
        title: `Prepare materials for ${task.title}`,
        description: `Gather all required materials`,
        type: 'preparation',
        priority: TaskPriority.MEDIUM
      }
    ];
  }

  async prioritizeTasks(tasks: Task[]): Promise<Task[]> {
    try {
      const systemMessage = `You are a task prioritization assistant. Analyze the following tasks and return them with updated priorities (CRITICAL, HIGH, MEDIUM, LOW).
        Consider due dates, task types, and current priorities. Return a JSON object with a "tasks" field containing an array of objects with "id" and "priority" fields.`;
      
      const prompt = `Tasks to prioritize: ${JSON.stringify(tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        type: task.type,
        currentPriority: task.priority,
        dueDate: task.dueDate,
      })))}`;
  
      const response = await this.callGemini(prompt, systemMessage);
      
      // Response is already parsed by callGemini, no need to parse again
      if (!response || !response.tasks || !Array.isArray(response.tasks)) {
        console.warn('Invalid response format from AI service, using fallback');
        return this.fallbackPrioritization(tasks);
      }
      
      return tasks.map(task => {
        const updatedTask = response.tasks.find(t => t.id === task.id);
        return {
          ...task,
          priority: updatedTask?.priority || task.priority,
        };
      });
    } catch (error) {
      console.error('Error prioritizing tasks with Gemini:', error);
      return this.fallbackPrioritization(tasks);
    }
  }

  private fallbackPrioritization(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      if (a.priority === TaskPriority.CRITICAL && b.priority !== TaskPriority.CRITICAL) return -1;
      if (b.priority === TaskPriority.CRITICAL && a.priority !== TaskPriority.CRITICAL) return 1;

      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      if (a.type === 'work' && b.type !== 'work') return -1;
      if (b.type === 'work' && a.type !== 'work') return 1;

      return 0;
    });
  }

  async createPomodoroSchedule(tasks: Task[]): Promise<Array<Task & { pomodoroCount: number }>> {
    if (!tasks?.length) return [];
    
    try {
      const systemMessage = `You are a productivity assistant. Create a pomodoro schedule (35min work + 5min break) for these tasks.
        Return JSON format: {
          "schedule": [{
            "taskId": number,
            "pomodoroCount": number,
            "order": number
          }]
        }`;
      
      const prompt = `Tasks to schedule:
        ${JSON.stringify(tasks.map(task => ({
          id: task.id,
          title: task.title,
          priority: task.priority,
          type: task.type,
          duration: task.estimatedDuration || 30
        })))}
        
        Rules:
        1. Critical tasks first
        2. Group similar types together
        3. 1 pomodoro = 35min
        4. Return optimal order`;
  
      const response = await this.callGemini(prompt, systemMessage);
      
      
      if (!response?.schedule || !Array.isArray(response.schedule)) {
        throw new Error('Invalid schedule format');
      }
  
      return response.schedule
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(item => {
          const task = tasks.find(t => t.id === item.taskId);
          return task ? { 
            ...task, 
            pomodoroCount: item.pomodoroCount || 1 
          } : null;
        })
        .filter(Boolean);
    } catch (error) {
      console.error('Using fallback pomodoro schedule due to:', error.message);
      return this.getFallbackSchedule(tasks);
    }
  }
  
  private getFallbackSchedule(tasks: Task[]) {
    return [...tasks]
      .sort((a, b) => {
        // Critical first
        if (a.priority === 'critical' && b.priority !== 'critical') return -1;
        if (b.priority === 'critical' && a.priority !== 'critical') return 1;
        
        // High priority next
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (b.priority === 'high' && a.priority !== 'high') return 1;
        
        // Then by type
        if (a.type < b.type) return -1;
        if (a.type > b.type) return 1;
        
        // Finally by duration (shorter first)
        return (a.estimatedDuration || 30) - (b.estimatedDuration || 30);
      })
      .map(task => ({ 
        ...task, 
        pomodoroCount: Math.ceil((task.estimatedDuration || 30) / 35) || 1 
      }));
  }
}