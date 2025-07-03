import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn
  } from 'typeorm';
  import { Task } from './task.entity';
  import { User } from '../../users/entities/user.entity';
  
  @Entity()
  export class TaskGroup {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    name: string;
  
    @Column({ nullable: true })
    description: string;
  
    @Column({ default: false })
    isBatch: boolean;
  
    @OneToMany(() => Task, (task) => task.group)
    tasks: Task[];
  
    @ManyToOne(() => User, (user) => user.taskGroups)
    @JoinColumn({ name: 'userId' })
    user: User;
  
    @Column()
    userId: number;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }