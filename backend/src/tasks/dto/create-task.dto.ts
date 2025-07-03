import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsEnum,
    IsDateString,
    IsNumber,
    IsBoolean,
  } from 'class-validator';
  import { TaskPriority } from '../enums/task-priority.enum';
  import { TaskStatus } from '../enums/task-status.enum';
  import { TaskType } from '../enums/task-type.enum';

  export class CreateTaskDto {
    @IsNotEmpty()
    @IsString()
    title: string;
  
    @IsOptional()
    @IsString()
    description?: string;
  
    @IsOptional()
    @IsEnum(TaskStatus)
    status?: TaskStatus;
  
    @IsOptional()
    @IsEnum(TaskPriority)
    priority?: TaskPriority;
  
    @IsNotEmpty()
    @IsEnum(TaskType)
    type: TaskType;
  
    @IsOptional()
    @IsDateString()
    dueDate?: Date;
  
    @IsOptional()
    @IsNumber()
    estimatedDuration?: number;
  
    @IsOptional()
    @IsBoolean()
    isRecurring?: boolean;
  
    @IsOptional()
    @IsString()
    recurrencePattern?: string;
  
    @IsOptional()
    @IsBoolean()
    isBatchable?: boolean;
  
    @IsOptional()
    @IsNumber({}, { each: true })
    dependencyIds?: number[];
  }