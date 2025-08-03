import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { getDatabaseConfig } from './config/database.config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { CalendarModule } from './calendar/calendar.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    TasksModule,
    CalendarModule
  ],
})
export class AppModule {}