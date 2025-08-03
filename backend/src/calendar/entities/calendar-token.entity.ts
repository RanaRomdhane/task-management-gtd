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
  
  @Entity()
  export class CalendarToken {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    accessToken: string;
  
    @Column()
    refreshToken: string;
  
    @Column()
    expiresAt: Date;
  
    @Column()
    scope: string;
  
    @Column({ default: 'google' })
    provider: string;
  
    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;
  
    @Column()
    userId: number;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }