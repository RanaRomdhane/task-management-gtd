import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';
import { TaskGroup } from './entities/task-group.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { GetUser } from '../auth/get-user.decorator';
import { TaskStatus } from './enums/task-status.enum';
import { CreateTaskGroupDto, UpdateTaskGroupDto } from './dto/task-group.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('batch')
  batchSimilarTasks(@GetUser() user: User) {
    return this.tasksService.batchSimilarTasks(user);
  }

  @Post('prioritize')
  prioritizeTasks(@GetUser() user: User): Promise<Task[]> {
    return this.tasksService.prioritizeTasks(user);
  }

  @Get('schedule/pomodoro')
  getPomodoroSchedule(@GetUser() user: User): Promise<Task[]> {
    return this.tasksService.getPomodoroSchedule(user);
  }

  @Post('groups')
  async createGroup(
    @Body() createGroupDto: CreateTaskGroupDto,
    @GetUser() user: User,
  ): Promise<TaskGroup> {
    try {
      console.log('Controller: Creating group for user', user.id, 'with data:', createGroupDto);
      const result = await this.tasksService.createGroup(createGroupDto, user);
      console.log('Controller: Group created successfully:', result);
      return result;
    } catch (error) {
      console.error('Controller: Error creating group:', error);
      throw error;
    }
  }

  @Get('groups')
  async findAllGroups(@GetUser() user: User): Promise<TaskGroup[]> {
    try {
      console.log('Controller: Finding all groups for user', user.id);
      const result = await this.tasksService.findAllGroups(user);
      console.log('Controller: Found groups:', result.length);
      return result;
    } catch (error) {
      console.error('Controller: Error finding groups:', error);
      throw error;
    }
  }

  @Get('groups/:id')
  async findGroup(
    @Param('id', ParseIntPipe) id: number, 
    @GetUser() user: User
  ): Promise<TaskGroup> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid group ID');
    }
    try {
      console.log('Controller: Finding group', id, 'for user', user.id);
      const result = await this.tasksService.findGroup(id, user);
      console.log('Controller: Found group with', result.tasks?.length || 0, 'tasks');
      return result;
    } catch (error) {
      console.error('Controller: Error finding group:', error);
      throw error;
    }
  }

  @Put('groups/:id')
  async updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGroupDto: UpdateTaskGroupDto,
    @GetUser() user: User,
  ): Promise<TaskGroup> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid group ID');
    }
    try {
      console.log('Controller: Updating group', id, 'for user', user.id);
      const result = await this.tasksService.updateGroup(id, updateGroupDto, user);
      console.log('Controller: Group updated successfully');
      return result;
    } catch (error) {
      console.error('Controller: Error updating group:', error);
      throw error;
    }
  }

  @Delete('groups/:id')
  async removeGroup(
    @Param('id', ParseIntPipe) id: number, 
    @GetUser() user: User
  ): Promise<{ message: string }> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid group ID');
    }
    try {
      console.log('Controller: Deleting group', id, 'for user', user.id);
      await this.tasksService.removeGroup(id, user);
      console.log('Controller: Group deleted successfully');
      return { message: 'Task group deleted successfully' };
    } catch (error) {
      console.error('Controller: Error deleting group:', error);
      throw error;
    }
  }

  @Get('groups/:id/debug')
  async debugGroupTasks(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid group ID');
    }
    try {
      console.log('Controller: Debug endpoint for group', id);
      const result = await this.tasksService.getGroupWithTasksDebug(id, user);
      console.log('Controller: Debug data retrieved');
      return result;
    } catch (error) {
      console.error('Controller: Error in debug endpoint:', error);
      throw error;
    }
  }

  @Post()
  create(@Body() createTaskDto: CreateTaskDto, @GetUser() user: User): Promise<Task> {
    return this.tasksService.create(createTaskDto, user);
  }

  @Get()
  findAll(@GetUser() user: User): Promise<Task[]> {
    return this.tasksService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: User): Promise<Task> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid task ID');
    }
    return this.tasksService.findOne(id, user);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
    @GetUser() user: User,
  ): Promise<Task> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid task ID');
    }
    return this.tasksService.update(id, updateTaskDto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @GetUser() user: User): Promise<void> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid task ID');
    }
    return this.tasksService.remove(id, user);
  }

  @Put(':id/status/:status')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('status') status: TaskStatus,
    @GetUser() user: User,
  ): Promise<Task> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid task ID');
    }
    return this.tasksService.changeStatus(id, status, user);
  }

  @Post(':id/infer-dependencies')
  inferDependencies(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ): Promise<Task> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid task ID');
    }
    return this.tasksService.inferDependencies(id, user);
  }

  @Put(':taskId/groups/:groupId')
  async addTaskToGroup(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('groupId', ParseIntPipe) groupId: number,
    @GetUser() user: User,
  ): Promise<Task> {
    if (!taskId || isNaN(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }
    if (!groupId || isNaN(groupId)) {
      throw new BadRequestException('Invalid group ID');
    }
    try {
      console.log('Controller: Adding task', taskId, 'to group', groupId);
      const result = await this.tasksService.addTaskToGroup(taskId, groupId, user);
      console.log('Controller: Task added to group successfully');
      return result;
    } catch (error) {
      console.error('Controller: Error adding task to group:', error);
      throw error;
    }
  }

  @Delete(':taskId/groups')
  async removeTaskFromGroup(
    @Param('taskId', ParseIntPipe) taskId: number,
    @GetUser() user: User,
  ): Promise<Task> {
    if (!taskId || isNaN(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }
    try {
      console.log('Controller: Removing task', taskId, 'from group');
      const result = await this.tasksService.removeTaskFromGroup(taskId, user);
      console.log('Controller: Task removed from group successfully');
      return result;
    } catch (error) {
      console.error('Controller: Error removing task from group:', error);
      throw error;
    }
  }
}