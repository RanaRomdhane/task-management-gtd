import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToMany,
    JoinTable,
  } from 'typeorm';
  import { User } from '../../users/entities/user.entity';
  import { TaskGroup } from '../entities/task-group.entity';
  import { TaskStatus } from '../enums/task-status.enum';
  import { TaskPriority } from '../enums/task-priority.enum';
  import { TaskType } from '../enums/task-type.enum';
  
  @Entity()
  export class Task {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    title: string;
  
    @Column({ type: 'text', nullable: true })
    description: string;
  
    @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
    status: TaskStatus;
  
    @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
    priority: TaskPriority;
  
    @Column({ type: 'enum', enum: TaskType })
    type: TaskType;
  
    @Column({ nullable: true })
    dueDate: Date;
  
    @Column({ nullable: true })
    estimatedDuration: number; // in minutes
  
    @Column({ nullable: true })
    timeSpent: number; // in minutes
  
    @Column({ default: false })
    isRecurring: boolean;
  
    @Column({ nullable: true })
    recurrencePattern: string;
  
    @Column({ default: false })
    isBatchable: boolean;
  
    @Column({ default: false })
    isBatched: boolean;
  
    @Column({ nullable: true })
    batchId: string;
  
    @ManyToOne(() => User, (user) => user.tasks)
    @JoinColumn({ name: 'userId' })
    user: User;
  
    @Column()
    userId: number;
  
    @ManyToOne(() => TaskGroup, (group) => group.tasks, { nullable: true })
    group: TaskGroup;
  
    @Column({ nullable: true })
    groupId: number;
  
    @ManyToMany(() => Task, (task) => task.id, { nullable: true })
    @JoinTable()
    dependencies: Task[];
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }