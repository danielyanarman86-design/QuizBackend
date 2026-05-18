import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  OneToMany, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { QuizAssignment } from '../../assignments/entities/assignment.entity';
import { LiveSession } from '../../sessions/entities/live-session.entity';
import { StudentAnswer } from './student-answer.entity';

export enum AttemptStatus {
  IN_PROGRESS = 'inProgress',
  COMPLETED = 'completed',
}

@Entity('attempts')
export class Attempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column()
  studentId: string;

  @ManyToOne(() => QuizAssignment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignmentId' })
  assignment: QuizAssignment;

  @Column()
  assignmentId: string;

  @ManyToOne(() => LiveSession, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'liveSessionId' })
  liveSession: LiveSession;

  @Column({ nullable: true })
  liveSessionId: string;

  @Column({ type: 'enum', enum: AttemptStatus, default: AttemptStatus.IN_PROGRESS })
  status: AttemptStatus;

  @Column({ default: 0 })
  score: number;

  @Column({ default: 0 })
  totalPoints: number;

  @OneToMany(() => StudentAnswer, (a) => a.attempt, { cascade: true })
  answers: StudentAnswer[];

  @CreateDateColumn()
  startedAt: Date;

  @Column({ nullable: true })
  finishedAt: Date;
}
