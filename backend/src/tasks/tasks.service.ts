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
import { CreateTaskGroupDto, UpdateTaskGroupDto } from './dto/task-group.dto';
import { TaskStatus } from './enums/task-status.enum';
import { User } from '../users/entities/user.entity';
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
    try {
      console.log('Creating group with data:', createGroupDto);
      
      const group = this.taskGroupRepository.create({
        ...createGroupDto,
        user,
        userId: user.id, 
      });
      
      const savedGroup = await this.taskGroupRepository.save(group);
      console.log('Group created successfully:', savedGroup);
      
      return await this.taskGroupRepository.findOne({
        where: { id: savedGroup.id },
        relations: ['tasks'],
      });
    } catch (error) {
      console.error('Error creating group:', error);
      throw new InternalServerErrorException(`Failed to create task group: ${error.message}`);
    }
  }

  async updateGroup(
    id: number,
    updateGroupDto: UpdateTaskGroupDto, 
    user: User,
  ): Promise<TaskGroup> {
    try {
      const group = await this.findGroup(id, user);
      const updatedGroup = this.taskGroupRepository.merge(group, updateGroupDto);
      return await this.taskGroupRepository.save(updatedGroup);
    } catch (error) {
      console.error('Error updating group:', error);
      throw new InternalServerErrorException(`Failed to update task group: ${error.message}`);
    }
  }

  async removeGroup(id: number, user: User): Promise<void> {
    try {
      const group = await this.findGroup(id, user);
      
      await this.taskRepository.update(
        { groupId: group.id, userId: user.id },
        { groupId: null, isBatched: false }
      );
      
      await this.taskGroupRepository.remove(group);
    } catch (error) {
      console.error('Error removing group:', error);
      throw new InternalServerErrorException(`Failed to remove task group: ${error.message}`);
    }
  }

  async addTaskToGroup(
    taskId: number,
    groupId: number,
    user: User,
  ): Promise<Task> {
    try {
      const task = await this.findOne(taskId, user);
      const group = await this.findGroup(groupId, user);

      task.group = group;
      task.groupId = groupId; 
      return await this.taskRepository.save(task);
    } catch (error) {
      console.error('Error adding task to group:', error);
      throw new InternalServerErrorException(`Failed to add task to group: ${error.message}`);
    }
  }

  async removeTaskFromGroup(taskId: number, user: User): Promise<Task> {
    try {
      const task = await this.findOne(taskId, user);
      task.group = null;
      task.groupId = null; 
      return await this.taskRepository.save(task);
    } catch (error) {
      console.error('Error removing task from group:', error);
      throw new InternalServerErrorException(`Failed to remove task from group: ${error.message}`);
    }
  }

  async batchSimilarTasks(user: User): Promise<TaskGroup[]> {
    try {
      const tasks = await this.taskRepository
        .createQueryBuilder('task')
        .where('task.userId = :userId', { userId: user.id })
        .andWhere('task.isBatchable = :isBatchable', { isBatchable: true })
        .andWhere('task.isBatched = :isBatched', { isBatched: false })
        .andWhere('task.groupId IS NULL')
        .getMany();

      console.log(`Found ${tasks.length} batchable tasks for user ${user.id}`);

      if (tasks.length === 0) {
        return [];
      }

      const batchedGroups = await this.aiService.groupSimilarTasks(tasks);
      
      if (!Array.isArray(batchedGroups)) {
        throw new BadRequestException('AI service returned invalid grouping format');
      }

      return await this.taskRepository.manager.transaction(async (manager) => {
        const createdGroups: TaskGroup[] = [];
        
        for (const batch of batchedGroups) {
          if (!batch?.taskIds || !Array.isArray(batch.taskIds) || batch.taskIds.length === 0) {
            console.log('Skipping invalid batch:', batch);
            continue;
          }

          const validTasks = await manager
            .createQueryBuilder(Task, 'task')
            .where('task.id IN (:...ids)', { ids: batch.taskIds })
            .andWhere('task.userId = :userId', { userId: user.id })
            .andWhere('task.groupId IS NULL')
            .getMany();

          if (validTasks.length === 0) {
            console.log('No valid tasks found for batch:', batch.taskIds);
            continue;
          }

          const group = manager.create(TaskGroup, {
            name: batch.name || `Task Batch ${Date.now()}`,
            description: `Batch of ${validTasks.length} similar tasks`,
            isBatch: true,
            user,
            userId: user.id,
          });

          const savedGroup = await manager.save(TaskGroup, group);
          console.log('Created group:', savedGroup.id);

          const updateResult = await manager
            .createQueryBuilder()
            .update(Task)
            .set({ 
              groupId: savedGroup.id,
              isBatched: true 
            })
            .where('id IN (:...ids)', { ids: validTasks.map(t => t.id) })
            .andWhere('userId = :userId', { userId: user.id })
            .execute();

          console.log('Updated tasks result:', updateResult);

          const groupWithTasks = await manager
            .createQueryBuilder(TaskGroup, 'group')
            .leftJoinAndSelect('group.tasks', 'task')
            .where('group.id = :id', { id: savedGroup.id })
            .getOne();

          if (groupWithTasks) {
            console.log(`Group ${groupWithTasks.id} now has ${groupWithTasks.tasks?.length || 0} tasks`);
            createdGroups.push(groupWithTasks);
          }
        }

        return createdGroups;
      });

    } catch (error) {
      console.error('Error in batchSimilarTasks:', error);
      throw new InternalServerErrorException(`Failed to batch similar tasks: ${error.message}`);
    }
  }

  async findAllGroups(user: User): Promise<TaskGroup[]> {
    try {
      console.log(`Finding all groups for user ${user.id}`);
      
      const groups = await this.taskGroupRepository
        .createQueryBuilder('group')
        .leftJoinAndSelect('group.tasks', 'task') 
        .leftJoinAndSelect('task.dependencies', 'dependencies') 
        .where('group.userId = :userId', { userId: user.id })
        .orderBy('group.createdAt', 'DESC')
        .addOrderBy('task.priority', 'DESC')
        .addOrderBy('task.createdAt', 'ASC')
        .getMany();

      console.log(`Found ${groups.length} groups for user ${user.id}`);
      
      groups.forEach((group, index) => {
        console.log(`Group ${index + 1}:`, {
          id: group.id,
          name: group.name,
          userId: group.userId,
          isBatch: group.isBatch,
          tasksCount: group.tasks?.length || 0,
          tasks: group.tasks?.map(t => ({ 
            id: t.id, 
            title: t.title, 
            groupId: t.groupId 
          })) || []
        });
      });

      const verifiedGroups = groups.map(group => ({
        ...group,
        tasks: group.tasks || [] 
      }));

      console.log(`Returning ${verifiedGroups.length} groups`);
      return verifiedGroups;
    } catch (error) {
      console.error('Error in findAllGroups:', error);
      throw new InternalServerErrorException(`Failed to fetch task groups: ${error.message}`);
    }
  }

  async findGroup(id: number, user: User): Promise<TaskGroup> {
    try {
      const group = await this.taskGroupRepository
        .createQueryBuilder('group')
        .leftJoinAndSelect('group.tasks', 'task')
        .leftJoinAndSelect('task.dependencies', 'dependencies')
        .where('group.id = :id', { id })
        .andWhere('group.userId = :userId', { userId: user.id })
        .getOne();

      if (!group) {
        throw new NotFoundException(`Task group with ID ${id} not found`);
      }

      console.log(`Found group ${id} with ${group.tasks?.length || 0} tasks`);
      return group;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error finding group:', error);
      throw new InternalServerErrorException(`Failed to find task group: ${error.message}`);
    }
  }

  async getGroupWithTasksDebug(groupId: number, user: User): Promise<any> {
    try {
      const group = await this.taskGroupRepository.findOne({
        where: { id: groupId, userId: user.id },
        relations: ['tasks'],
      });

      const tasksInGroup = await this.taskRepository.find({
        where: { groupId: groupId, userId: user.id },
      });

      const allUserTasks = await this.taskRepository.find({
        where: { userId: user.id },
        relations: ['group'],
      });

      return {
        group,
        tasksFromGroupRelation: group?.tasks || [],
        tasksFromDirectQuery: tasksInGroup,
        allUserTasks: allUserTasks.map(t => ({
          id: t.id,
          title: t.title,
          groupId: t.groupId,
          group: t.group ? { id: t.group.id, name: t.group.name } : null
        })),
        counts: {
          fromRelation: group?.tasks?.length || 0,
          fromDirectQuery: tasksInGroup.length,
          totalUserTasks: allUserTasks.length,
        }
      };
    } catch (error) {
      console.error('Error in debug method:', error);
      throw new InternalServerErrorException(`Debug query failed: ${error.message}`);
    }
  }

  async inferDependencies(taskId: number, user: User): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, user: { id: user.id } },
      relations: ['dependencies'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    try {
      const inferredDependencies = await this.aiService.inferTaskDependencies(task);
      
      if (!Array.isArray(inferredDependencies)) {
        throw new BadRequestException('Invalid response format from AI service');
      }

      return await this.taskRepository.manager.transaction(async (transactionalEntityManager) => {
        const dependencies: Task[] = [];
        
        for (const inferredTask of inferredDependencies) {
          if (!inferredTask?.title || typeof inferredTask.title !== 'string') {
            continue;
          }

          let existingTask = await transactionalEntityManager.findOne(Task, {
            where: {
              title: inferredTask.title,
              user: { id: user.id },
            },
          });

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

          if (!task.dependencies?.some(d => d.id === existingTask.id)) {
            dependencies.push(existingTask);
          }
        }

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