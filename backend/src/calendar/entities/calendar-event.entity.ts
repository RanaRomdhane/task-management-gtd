import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { User } from '../../users/entities/user.entity';
  import { Task } from '../../tasks/entities/task.entity';
  
  @Entity()
  export class CalendarEvent {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    googleEventId: string;
  
    @Column()
    title: string;
  
    @Column({ type: 'text', nullable: true })
    description: string;
  
    @Column()
    startTime: Date;
  
    @Column()
    endTime: Date;
  
    @Column({ nullable: true })
    location: string;
  
    @Column({ default: false })
    isAllDay: boolean;
  
    @Column({ default: 'google' })
    provider: string;
  
    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;
  
    @Column()
    userId: number;
  
    @ManyToOne(() => Task, { nullable: true })
    @JoinColumn({ name: 'taskId' })
    task: Task;
  
    @Column({ nullable: true })
    taskId: number;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }