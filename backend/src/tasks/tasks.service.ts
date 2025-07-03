import {
    Injectable,
    NotFoundException,
    BadRequestException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository, In, Not, IsNull } from 'typeorm';
  import { Task } from './entities/task.entity';
  import { TaskGroup } from './entities/task-group.entity';
  import { CreateTaskDto } from './dto/create-task.dto';
  import { UpdateTaskDto } from './dto/update-task.dto';
  import { TaskStatus } from './enums/task-status.enum';
  import { User } from '../users/entities/user.entity';
  import { CreateTaskGroupDto } from './dto/task-group.dto';
  import { AiService } from '../ai/ai.service';
  import { TaskType } from './enums/task-type.enum';
  import { TaskPriority } from './enums/task-priority.enum';
  import { InternalServerErrorException } from '@nestjs/common';
  
  @Injectable()
  export class TasksService {
    constructor(
      @InjectRepository(Task)
      private readonly taskRepository: Repository<Task>,
      @InjectRepository(TaskGroup)
      private readonly taskGroupRepository: Repository<TaskGroup>,
      private readonly aiService: AiService,
    ) {}
  
    async create(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
      const task = this.taskRepository.create({
        ...createTaskDto,
        user,
      });
  
      if (createTaskDto.dependencyIds && createTaskDto.dependencyIds.length > 0) {
        const dependencies = await this.taskRepository.find({
          where: { id: In(createTaskDto.dependencyIds), user: { id: user.id } },
        });
        task.dependencies = dependencies;
      }
  
      return this.taskRepository.save(task);
    }
  
    async findAll(user: User): Promise<Task[]> {
      return this.taskRepository.find({
        where: { user: { id: user.id } },
        relations: ['dependencies', 'group'],
      });
    }
  
    async findOne(id: number, user: User): Promise<Task> {
      const task = await this.taskRepository.findOne({
        where: { id, user: { id: user.id } },
        relations: ['dependencies', 'group'],
      });
  
      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }
  
      return task;
    }
  
    async update(
      id: number,
      updateTaskDto: UpdateTaskDto,
      user: User,
    ): Promise<Task> {
      const task = await this.findOne(id, user);
      const updatedTask = this.taskRepository.merge(task, updateTaskDto);
  
      if (updateTaskDto.dependencyIds) {
        const dependencies = await this.taskRepository.find({
          where: { id: In(updateTaskDto.dependencyIds), user: { id: user.id } },
        });
        updatedTask.dependencies = dependencies;
      }
  
      return this.taskRepository.save(updatedTask);
    }
  
    async remove(id: number, user: User): Promise<void> {
      const task = await this.findOne(id, user);
      await this.taskRepository.remove(task);
    }
  
    async changeStatus(
      id: number,
      status: TaskStatus,
      user: User,
    ): Promise<Task> {
      const task = await this.findOne(id, user);
      task.status = status;
      return this.taskRepository.save(task);
    }
  
    async createGroup(
      createGroupDto: CreateTaskGroupDto,
      user: User,
    ): Promise<TaskGroup> {
      const group = this.taskGroupRepository.create({
        ...createGroupDto,
        user,
      });
      return this.taskGroupRepository.save(group);
    }
  
    async findAllGroups(user: User): Promise<TaskGroup[]> {
      return this.taskGroupRepository.find({
        where: { user: { id: user.id } },
        relations: ['tasks'],
      });
    }
  
    async findGroup(id: number, user: User): Promise<TaskGroup> {
      const group = await this.taskGroupRepository.findOne({
        where: { id, user: { id: user.id } },
        relations: ['tasks'],
      });
  
      if (!group) {
        throw new NotFoundException(`Task group with ID ${id} not found`);
      }
  
      return group;
    }
  
    async updateGroup(
      id: number,
      updateGroupDto: UpdateTaskDto,
      user: User,
    ): Promise<TaskGroup> {
      const group = await this.findGroup(id, user);
      const updatedGroup = this.taskGroupRepository.merge(group, updateGroupDto);
      return this.taskGroupRepository.save(updatedGroup);
    }
  
    async removeGroup(id: number, user: User): Promise<void> {
      const group = await this.findGroup(id, user);
      
      // Remove tasks from the group before deleting
      if (group.tasks && group.tasks.length > 0) {
        await this.taskRepository.update(
          { group: { id: group.id } },
          { group: null },
        );
      }
      
      await this.taskGroupRepository.remove(group);
    }
  
    async addTaskToGroup(
      taskId: number,
      groupId: number,
      user: User,
    ): Promise<Task> {
      const task = await this.findOne(taskId, user);
      const group = await this.findGroup(groupId, user);
  
      task.group = group;
      return this.taskRepository.save(task);
    }
  
    async removeTaskFromGroup(taskId: number, user: User): Promise<Task> {
      const task = await this.findOne(taskId, user);
      task.group = null;
      return this.taskRepository.save(task);
    }
  
    async batchSimilarTasks(user: User): Promise<TaskGroup[]> {
  // Get all batchable tasks
  const tasks = await this.taskRepository.find({
    where: {
      user: { id: user.id },
      isBatchable: true,
      isBatched: false,
      group: IsNull(),
    },
  });

  // Return empty array if no tasks to batch
  if (tasks.length === 0) {
    return [];
  }

  // Use AI to group similar tasks
  const batchedGroups = await this.aiService.groupSimilarTasks(tasks);
  
  // Validate the response
  if (!Array.isArray(batchedGroups)) {
    throw new BadRequestException('AI service returned invalid grouping format');
  }

  // Create task groups and update tasks
  const createdGroups: TaskGroup[] = [];
  
  for (const batch of batchedGroups) {
    // Additional validation
    if (!batch?.taskIds || !Array.isArray(batch.taskIds)) {
      continue; // or throw error if you prefer
    }

    const group = await this.taskGroupRepository.save({
      name: batch.name || `Task Batch ${Date.now()}`,
      description: `Batch of ${batch.taskIds.length} similar tasks`,
      isBatch: true,
      user,
    });

    await this.taskRepository.update(
      { id: In(batch.taskIds) },
      { group: { id: group.id }, isBatched: true },
    );

    createdGroups.push(group);
  }

  return createdGroups;
}
  
async inferDependencies(taskId: number, user: User): Promise<Task> {
    // Get the task with relations
    const task = await this.taskRepository.findOne({
      where: { id: taskId, user: { id: user.id } },
      relations: ['dependencies'],
    });
  
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }
  
    try {
      // Call AI service with proper error handling
      const inferredDependencies = await this.aiService.inferTaskDependencies(task);
      
      // Validate the response
      if (!Array.isArray(inferredDependencies)) {
        throw new BadRequestException('Invalid response format from AI service');
      }
  
      // Process dependencies in a transaction
      return await this.taskRepository.manager.transaction(async (transactionalEntityManager) => {
        const dependencies: Task[] = [];
        
        for (const inferredTask of inferredDependencies) {
          // Validate required fields
          if (!inferredTask?.title || typeof inferredTask.title !== 'string') {
            continue;
          }
  
          // Check if task already exists
          let existingTask = await transactionalEntityManager.findOne(Task, {
            where: {
              title: inferredTask.title,
              user: { id: user.id },
            },
          });
  
          // Create new task if it doesn't exist
          if (!existingTask) {
            existingTask = transactionalEntityManager.create(Task, {
              title: inferredTask.title,
              description: inferredTask.description || '',
              type: Object.values(TaskType).includes(inferredTask.type as TaskType) 
                ? inferredTask.type as TaskType 
                : TaskType.OTHER,
              priority: inferredTask.priority || TaskPriority.MEDIUM,
              user,
            });
            await transactionalEntityManager.save(existingTask);
          }
  
          // Add to dependencies if not already a dependency
          if (!task.dependencies?.some(d => d.id === existingTask.id)) {
            dependencies.push(existingTask);
          }
        }
  
        // Update the task with new dependencies
        if (dependencies.length > 0) {
          task.dependencies = [...(task.dependencies || []), ...dependencies];
          return await transactionalEntityManager.save(task);
        }
  
        return task;
      });
    } catch (error) {
      console.error('Error in inferDependencies:', error);
      
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Failed to infer task dependencies');
    }
  }
  
    async prioritizeTasks(user: User): Promise<Task[]> {
      const tasks = await this.taskRepository.find({
        where: {
          user: { id: user.id },
          status: Not(TaskStatus.DONE),
        },
      });
  
      const prioritizedTasks = await this.aiService.prioritizeTasks(tasks);
      
      // Update task priorities in the database
      for (const task of prioritizedTasks) {
        await this.taskRepository.update(
          { id: task.id },
          { priority: task.priority },
        );
      }
  
      return this.taskRepository.find({
        where: { user: { id: user.id } },
        order: { priority: 'DESC' },
      });
    }
  
    async getPomodoroSchedule(user: User): Promise<Task[]> {
      const tasks = await this.taskRepository.find({
        where: {
          user: { id: user.id },
          status: Not(TaskStatus.DONE),
        },
        order: { priority: 'DESC' },
      });
  
      return this.aiService.createPomodoroSchedule(tasks);
    }
  }