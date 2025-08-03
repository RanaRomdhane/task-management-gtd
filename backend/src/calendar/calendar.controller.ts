import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
  Res,
  Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateEventDto, UpdateEventDto } from './dto/create-event.dto';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('auth-url')
  @UseGuards(JwtAuthGuard)
  getAuthUrl() {
    const authUrl = this.calendarService.generateAuthUrl();
    return { authUrl };
  }

  // Add GET route for OAuth callback
  @Get('callback')
  async handleCallbackGet(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    if (!code) {
      // Redirect to frontend with error
      return res.redirect(`${process.env.GOOGLE_FRONTEND_REDIRECT}?error=no_code`);
    }

    try {
      // Store the code in a way that the frontend can access it
      // Since we can't get the user from JWT in a GET callback, 
      // we'll redirect to frontend with the code
      return res.redirect(`${process.env.GOOGLE_FRONTEND_REDIRECT}?code=${code}`);
    } catch (error) {
      return res.redirect(`${process.env.GOOGLE_FRONTEND_REDIRECT}?error=callback_failed`);
    }
  }

  @Post('callback')
  @UseGuards(JwtAuthGuard)
  async handleCallback(
    @Body('code') code: string,
    @GetUser() user: User,
  ) {
    if (!code) {
      throw new BadRequestException('Authorization code is required');
    }
    return this.calendarService.handleCallback(code, user);
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect(@GetUser() user: User) {
    return this.calendarService.disconnectCalendar(user);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getConnectionStatus(@GetUser() user: User) {
    const isConnected = await this.calendarService.isConnected(user);
    return { connected: isConnected };
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async syncEvents(@GetUser() user: User) {
    return this.calendarService.syncEvents(user);
  }

  @Get('events')
  @UseGuards(JwtAuthGuard)
  async getEvents(
    @GetUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limitStr?: string,
  ) {
    try {
      console.log('Received query params:', { startDate, endDate, limitStr });
      
      // Parse and validate dates
      let start: Date | undefined;
      let end: Date | undefined;
      let limit: number | undefined;
      
      if (startDate) {
        start = new Date(startDate);
        if (isNaN(start.getTime())) {
          throw new BadRequestException(`Invalid startDate format: ${startDate}. Expected ISO 8601 format.`);
        }
      }
      
      if (endDate) {
        end = new Date(endDate);
        if (isNaN(end.getTime())) {
          throw new BadRequestException(`Invalid endDate format: ${endDate}. Expected ISO 8601 format.`);
        }
      }
      
      if (limitStr) {
        limit = parseInt(limitStr, 10);
        if (isNaN(limit) || limit <= 0) {
          throw new BadRequestException(`Invalid limit: ${limitStr}. Must be a positive number.`);
        }
      }
      
      // Validate date range
      if (start && end && start >= end) {
        throw new BadRequestException('startDate must be before endDate');
      }
      
      console.log('Parsed dates:', { start, end, limit });
      
      // Check if user has calendar connection
      const hasConnection = await this.calendarService.isConnected(user);
      if (!hasConnection) {
        // Return empty array instead of error for better UX
        console.log('User has no calendar connection, returning empty events');
        return [];
      }
      
      const events = await this.calendarService.getEvents(user, start, end);
      
      // Apply limit if specified
      if (limit && events.length > limit) {
        return events.slice(0, limit);
      }
      
      return events;
    } catch (error) {
      console.error('Error in getEvents controller:', error);
      
      // Re-throw BadRequestExceptions as-is
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Handle other errors
      throw new BadRequestException(`Failed to retrieve events: ${error.message}`);
    }
  }

  @Post('events')
  @UseGuards(JwtAuthGuard)
  async createEvent(
    @Body() createEventDto: CreateEventDto,
    @GetUser() user: User,
  ) {
    return this.calendarService.createEvent(createEventDto, user);
  }

  @Put('events/:id')
  @UseGuards(JwtAuthGuard)
  async updateEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEventDto: UpdateEventDto,
    @GetUser() user: User,
  ) {
    return this.calendarService.updateEvent(id, updateEventDto, user);
  }

  @Delete('events/:id')
  @UseGuards(JwtAuthGuard)
  async deleteEvent(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
    return this.calendarService.deleteEvent(id, user);
  }

  @Post('events/from-task/:taskId')
  @UseGuards(JwtAuthGuard)
  async createEventFromTask(
    @Param('taskId', ParseIntPipe) taskId: number,
    @GetUser() user: User,
  ) {
    return this.calendarService.createEventFromTask(taskId, user);
  }

  @Get('tasks-with-events')
  @UseGuards(JwtAuthGuard)
  async getTasksWithEvents(@GetUser() user: User) {
    return this.calendarService.getTasksWithEvents(user);
  }
}