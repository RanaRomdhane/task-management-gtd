import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { CalendarToken } from './entities/calendar-token.entity';
import { CalendarEvent } from './entities/calendar-event.entity';
import { User } from '../users/entities/user.entity';
import { Task } from '../tasks/entities/task.entity';
import { CreateEventDto, UpdateEventDto } from './dto/create-event.dto';

@Injectable()
export class CalendarService {
  private oauth2Client;

  constructor(
    @InjectRepository(CalendarToken)
    private calendarTokenRepository: Repository<CalendarToken>,
    @InjectRepository(CalendarEvent)
    private calendarEventRepository: Repository<CalendarEvent>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private configService: ConfigService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT_URI'),
    );
  }

  generateAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }


  async disconnectCalendar(user: User): Promise<{ success: boolean; message: string }> {
    const token = await this.calendarTokenRepository.findOne({
      where: { userId: user.id, provider: 'google' },
    });

    if (!token) {
      throw new NotFoundException('No Google Calendar connection found');
    }

    await this.calendarTokenRepository.remove(token);
    return { success: true, message: 'Google Calendar disconnected successfully' };
  }

  async isConnected(user: User): Promise<boolean> {
    const token = await this.calendarTokenRepository.findOne({
      where: { userId: user.id, provider: 'google' },
    });
    return !!token;
  }

  private async getValidToken(user: User): Promise<CalendarToken> {
    const token = await this.calendarTokenRepository.findOne({
      where: { userId: user.id, provider: 'google' },
    });

    if (!token) {
      throw new NotFoundException('Google Calendar not connected');
    }

    // Check if token needs refresh
    if (new Date() >= token.expiresAt) {
      try {
        this.oauth2Client.setCredentials({
          refresh_token: token.refreshToken,
        });

        const { credentials } = await this.oauth2Client.refreshAccessToken();
        
        token.accessToken = credentials.access_token;
        if (credentials.expiry_date) {
          token.expiresAt = new Date(credentials.expiry_date);
        }
        
        await this.calendarTokenRepository.save(token);
      } catch (error) {
        console.error('Error refreshing token:', error);
        throw new BadRequestException('Failed to refresh Google Calendar token');
      }
    }

    return token;
  }

  private async getCalendarClient(user: User) {
    const token = await this.getValidToken(user);
    
    this.oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
    });

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  async syncEvents(user: User): Promise<{ synced: number; message: string }> {
    try {
      const calendar = await this.getCalendarClient(user);
      
      // Get events from the last 30 days to next 30 days
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 30);
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 30);

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      let syncedCount = 0;

      for (const event of events) {
        if (!event.id || !event.summary) continue;

        const existingEvent = await this.calendarEventRepository.findOne({
          where: { googleEventId: event.id, userId: user.id },
        });

        const startTime = event.start?.dateTime ? new Date(event.start.dateTime) : new Date(event.start?.date || '');
        const endTime = event.end?.dateTime ? new Date(event.end.dateTime) : new Date(event.end?.date || '');

        if (existingEvent) {
          // Update existing event
          existingEvent.title = event.summary;
          existingEvent.description = event.description || '';
          existingEvent.startTime = startTime;
          existingEvent.endTime = endTime;
          existingEvent.location = event.location || '';
          existingEvent.isAllDay = !event.start?.dateTime;
          
          await this.calendarEventRepository.save(existingEvent);
        } else {
          // Create new event
          const newEvent = this.calendarEventRepository.create({
            googleEventId: event.id,
            title: event.summary,
            description: event.description || '',
            startTime,
            endTime,
            location: event.location || '',
            isAllDay: !event.start?.dateTime,
            provider: 'google',
            user,
            userId: user.id,
          });
          
          await this.calendarEventRepository.save(newEvent);
          syncedCount++;
        }
      }

      return { synced: syncedCount, message: `Synced ${syncedCount} new events from Google Calendar` };
    } catch (error) {
      console.error('Error syncing events:', error);
      throw new BadRequestException('Failed to sync events from Google Calendar');
    }
  }

  async getEvents(user: User, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    const query = this.calendarEventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.task', 'task')
      .where('event.userId = :userId', { userId: user.id });

    if (startDate) {
      query.andWhere('event.startTime >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('event.endTime <= :endDate', { endDate });
    }

    return query.orderBy('event.startTime', 'ASC').getMany();
  }

  async createEvent(createEventDto: CreateEventDto, user: User): Promise<CalendarEvent> {
    try {
      // Ensure dates are properly instantiated
      const startTime = new Date(createEventDto.startTime);
      const endTime = new Date(createEventDto.endTime);
  
      const calendar = await this.getCalendarClient(user);
  
      // Create event in Google Calendar
      const googleEvent = {
        summary: createEventDto.title,
        description: createEventDto.description,
        start: {
          dateTime: createEventDto.isAllDay ? undefined : startTime.toISOString(),
          date: createEventDto.isAllDay ? startTime.toISOString().split('T')[0] : undefined,
          timeZone: 'UTC',
        },
        end: {
          dateTime: createEventDto.isAllDay ? undefined : endTime.toISOString(),
          date: createEventDto.isAllDay ? endTime.toISOString().split('T')[0] : undefined,
          timeZone: 'UTC',
        },
        location: createEventDto.location,
      };
  
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: googleEvent,
      });
  
      if (!response.data.id) {
        throw new BadRequestException('Failed to create event in Google Calendar');
      }
  
      // Save to local database
      const localEvent = this.calendarEventRepository.create({
        googleEventId: response.data.id,
        title: createEventDto.title,
        description: createEventDto.description || '',
        startTime,
        endTime,
        location: createEventDto.location || '',
        isAllDay: createEventDto.isAllDay || false,
        provider: 'google',
        user,
        userId: user.id,
        taskId: createEventDto.taskId,
      });
  
      return await this.calendarEventRepository.save(localEvent);
    } catch (error) {
      console.error('Detailed error creating event:', {
        error: error.message,
        startTime: createEventDto.startTime,
        endTime: createEventDto.endTime,
        isAllDay: createEventDto.isAllDay
      });
      throw new BadRequestException('Failed to create calendar event: ' + error.message);
    }
  }

  async updateEvent(eventId: number, updateEventDto: UpdateEventDto, user: User): Promise<CalendarEvent> {
    const event = await this.calendarEventRepository.findOne({
      where: { id: eventId, userId: user.id },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    try {
      const calendar = await this.getCalendarClient(user);
      const startTime = updateEventDto.startTime || event.startTime;
      const endTime = updateEventDto.endTime || event.endTime;

      // Update event in Google Calendar
      const googleEvent = {
        summary: updateEventDto.title || event.title,
        description: updateEventDto.description || event.description,
        start: {
          dateTime: updateEventDto.isAllDay === false || (updateEventDto.isAllDay === undefined && !event.isAllDay) 
            ? (startTime instanceof Date ? startTime : new Date(startTime)).toISOString() 
            : undefined,
          date: updateEventDto.isAllDay === true || (updateEventDto.isAllDay === undefined && event.isAllDay)
            ? (startTime instanceof Date ? startTime : new Date(startTime)).toISOString().split('T')[0] 
            : undefined,
          timeZone: 'UTC',
        },
        end: {
          dateTime: updateEventDto.isAllDay === false || (updateEventDto.isAllDay === undefined && !event.isAllDay)
            ? (endTime instanceof Date ? endTime : new Date(endTime)).toISOString()
            : undefined,
          date: updateEventDto.isAllDay === true || (updateEventDto.isAllDay === undefined && event.isAllDay)
            ? (endTime instanceof Date ? endTime : new Date(endTime)).toISOString().split('T')[0]
            : undefined,
          timeZone: 'UTC',
        },
        location: updateEventDto.location || event.location,
      };

      await calendar.events.update({
        calendarId: 'primary',
        eventId: event.googleEventId,
        requestBody: googleEvent,
      });

      // Update local database
      Object.assign(event, updateEventDto);
      return await this.calendarEventRepository.save(event);
    } catch (error) {
      console.error('Error updating event:', error);
      throw new BadRequestException('Failed to update calendar event');
    }
  }

  async deleteEvent(eventId: number, user: User): Promise<{ success: boolean; message: string }> {
    const event = await this.calendarEventRepository.findOne({
      where: { id: eventId, userId: user.id },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    try {
      const calendar = await this.getCalendarClient(user);

      // Delete from Google Calendar
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: event.googleEventId,
      });

      // Delete from local database
      await this.calendarEventRepository.remove(event);

      return { success: true, message: 'Event deleted successfully' };
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new BadRequestException('Failed to delete calendar event');
    }
  }

  async createEventFromTask(taskId: number, user: User): Promise<CalendarEvent> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, userId: user.id },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if event already exists for this task
    const existingEvent = await this.calendarEventRepository.findOne({
      where: { taskId: task.id, userId: user.id },
    });

    if (existingEvent) {
      throw new BadRequestException('Calendar event already exists for this task');
    }

    // Create event based on task details
    const startTime = task.dueDate || new Date();
    const endTime = new Date(startTime.getTime() + (task.estimatedDuration || 60) * 60000);

    const createEventDto: CreateEventDto = {
      title: task.title,
      description: task.description || `Task: ${task.title}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      taskId: task.id,
    };

    return this.createEvent(createEventDto, user);
  }

  async getTasksWithEvents(user: User): Promise<Task[]> {
    return this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.dependencies', 'dependencies')
      .leftJoinAndSelect('task.group', 'group')
      .leftJoin('calendar_event', 'event', 'event.taskId = task.id')
      .where('task.userId = :userId', { userId: user.id })
      .andWhere('event.id IS NOT NULL')
      .getMany();
  }

  // Update the handleCallback method in calendar.service.ts
async handleCallback(code: string, user: User): Promise<{ success: boolean; message: string }> {
  try {
    // Configure OAuth client with proper settings
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT_URI')
    );

    // Get tokens with proper error handling
    const { tokens } = await this.oauth2Client.getToken(code).catch(error => {
      console.error('Google token exchange error:', error.response?.data);
      throw new BadRequestException('Google authentication failed');
    });

    if (!tokens) {
      throw new BadRequestException('No tokens received from Google');
    }

    // Debug logging
    console.log('Received tokens:', {
      access_token: !!tokens.access_token,
      refresh_token: !!tokens.refresh_token,
      expiry_date: tokens.expiry_date
    });

    if (!tokens.access_token) {
      throw new BadRequestException('No access token received');
    }

    // Handle cases where refresh token isn't returned (already authorized)
    const existingToken = await this.calendarTokenRepository.findOne({ 
      where: { userId: user.id, provider: 'google' }
    });

    const refreshToken = tokens.refresh_token || existingToken?.refreshToken;
    if (!refreshToken) {
      throw new BadRequestException('No refresh token available - please reauthenticate');
    }

    const expiresAt = tokens.expiry_date 
      ? new Date(tokens.expiry_date) 
      : new Date(Date.now() + 3600 * 1000);

    // Upsert token record
    await this.calendarTokenRepository.upsert(
      {
        accessToken: tokens.access_token,
        refreshToken,
        expiresAt,
        scope: tokens.scope || 'calendar',
        provider: 'google',
        userId: user.id,
      },
      ['userId', 'provider']
    );

    return { success: true, message: 'Google Calendar connected successfully' };
  } catch (error) {
    console.error('Full error details:', error);
    throw new BadRequestException(
      error.response?.data?.error || 
      error.message || 
      'Failed to connect Google Calendar'
    );
  }
}
}