import { IsNotEmpty, IsString, IsOptional, IsDateString, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsDateString({}, { message: 'startTime must be a valid ISO 8601 date string' })
  startTime: string; // Keep as string for validation

  @IsNotEmpty()
  @IsDateString({}, { message: 'endTime must be a valid ISO 8601 date string' })
  endTime: string; // Keep as string for validation

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taskId?: number;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'startTime must be a valid ISO 8601 date string' })
  startTime?: string; // Keep as string for validation

  @IsOptional()
  @IsDateString({}, { message: 'endTime must be a valid ISO 8601 date string' })
  endTime?: string; // Keep as string for validation

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;
}