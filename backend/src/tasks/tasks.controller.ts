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
  } from '@nestjs/common';
  import { TasksService } from './tasks.service';
  import { CreateTaskDto } from './dto/create-task.dto';
  import { UpdateTaskDto } from './dto/update-task.dto';
  import { Task } from './entities/task.entity';
  import { JwtAuthGuard } from '../auth/jwt-auth.guard';
  import { User } from '../users/entities/user.entity';
  import { GetUser } from '../auth/get-user.decorator';
  import { TaskStatus } from './enums/task-status.enum';
  import { CreateTaskGroupDto, UpdateTaskGroupDto } from './dto/task-group.dto';
  
  @Controller('tasks')
  @UseGuards(JwtAuthGuard)
  export class TasksController {
    constructor(private readonly tasksService: TasksService) {}
  
    @Post()
    create(@Body() createTaskDto: CreateTaskDto, @GetUser() user: User): Promise<Task> {
      return this.tasksService.create(createTaskDto, user);
    }
  
    @Get()
    findAll(@GetUser() user: User): Promise<Task[]> {
      return this.tasksService.findAll(user);
    }
  
    @Get(':id')
    findOne(@Param('id') id: string, @GetUser() user: User): Promise<Task> {
      return this.tasksService.findOne(+id, user);
    }
  
    @Put(':id')
    update(
      @Param('id') id: string,
      @Body() updateTaskDto: UpdateTaskDto,
      @GetUser() user: User,
    ): Promise<Task> {
      return this.tasksService.update(+id, updateTaskDto, user);
    }
  
    @Delete(':id')
    remove(@Param('id') id: string, @GetUser() user: User): Promise<void> {
      return this.tasksService.remove(+id, user);
    }
  
    @Put(':id/status/:status')
    changeStatus(
      @Param('id') id: string,
      @Param('status') status: TaskStatus,
      @GetUser() user: User,
    ): Promise<Task> {
      return this.tasksService.changeStatus(+id, status, user);
    }
  
    @Post('batch')
    batchSimilarTasks(@GetUser() user: User) {
      return this.tasksService.batchSimilarTasks(user);
    }
  
    @Post(':id/infer-dependencies')
    inferDependencies(
      @Param('id') id: string,
      @GetUser() user: User,
    ): Promise<Task> {
      return this.tasksService.inferDependencies(+id, user);
    }
  
    @Post('prioritize')
    prioritizeTasks(@GetUser() user: User): Promise<Task[]> {
      return this.tasksService.prioritizeTasks(user);
    }
  
    @Get('schedule/pomodoro')
    getPomodoroSchedule(@GetUser() user: User): Promise<Task[]> {
      return this.tasksService.getPomodoroSchedule(user);
    }
  
    // Task Group endpoints
    @Post('groups')
    createGroup(
      @Body() createGroupDto: CreateTaskGroupDto,
      @GetUser() user: User,
    ) {
      return this.tasksService.createGroup(createGroupDto, user);
    }
  
    @Get('groups')
    findAllGroups(@GetUser() user: User) {
      return this.tasksService.findAllGroups(user);
    }
  
    @Get('groups/:id')
    findGroup(@Param('id') id: string, @GetUser() user: User) {
      return this.tasksService.findGroup(+id, user);
    }
  
    @Put('groups/:id')
    updateGroup(
      @Param('id') id: string,
      @Body() updateGroupDto: UpdateTaskGroupDto,
      @GetUser() user: User,
    ) {
      return this.tasksService.updateGroup(+id, updateGroupDto, user);
    }
  
    @Delete('groups/:id')
    removeGroup(@Param('id') id: string, @GetUser() user: User) {
      return this.tasksService.removeGroup(+id, user);
    }
  
    @Put(':taskId/groups/:groupId')
    addTaskToGroup(
      @Param('taskId') taskId: string,
      @Param('groupId') groupId: string,
      @GetUser() user: User,
    ) {
      return this.tasksService.addTaskToGroup(+taskId, +groupId, user);
    }
  
    @Delete(':taskId/groups')
    removeTaskFromGroup(
      @Param('taskId') taskId: string,
      @GetUser() user: User,
    ) {
      return this.tasksService.removeTaskFromGroup(+taskId, user);
    }
  }