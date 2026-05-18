import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn,
} from 'typeorm';
import { QuizAssignment } from '../../assignments/entities/assignment.entity';

export enum LiveSessionStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  FINISHED = 'finished',
}

@Entity('live_sessions')
export class LiveSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => QuizAssignment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignmentId' })
  assignment: QuizAssignment;

  @Column()
  assignmentId: string;

  @Column({ unique: true, length: 6 })
  pin: string;

  @Column({ type: 'enum', enum: LiveSessionStatus, default: LiveSessionStatus.WAITING })
  status: LiveSessionStatus;

  @Column({ default: 0 })
  currentQuestionIndex: number;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ nullable: true })
  finishedAt: Date;
}
