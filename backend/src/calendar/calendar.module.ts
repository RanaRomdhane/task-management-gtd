import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CalendarToken } from './entities/calendar-token.entity';
import { CalendarEvent } from './entities/calendar-event.entity';
import { Task } from '../tasks/entities/task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CalendarToken, CalendarEvent, Task]),
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}