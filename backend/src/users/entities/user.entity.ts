import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    BeforeInsert,
  } from 'typeorm';
  import { Task } from '../../tasks/entities/task.entity';
  import { TaskGroup } from '../../tasks/entities/task-group.entity';
  import * as bcrypt from 'bcrypt';
  
  @Entity()
  export class User {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ unique: true })
    email: string;
  
    @Column()
    password: string;
  
    @Column({ nullable: true })
    firstName: string;
  
    @Column({ nullable: true })
    lastName: string;
  
    @Column({ default: true })
    isActive: boolean;
  
    @OneToMany(() => Task, (task) => task.user)
    tasks: Task[];
  
    @OneToMany(() => TaskGroup, (group) => group.user)
    taskGroups: TaskGroup[];
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  
    @BeforeInsert()
    async hashPassword() {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }