import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { LiveSession } from './live-session.entity';

@Entity('live_session_results')
export class LiveSessionResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => LiveSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: LiveSession;

  @Column()
  sessionId: string;

  @Column()
  playerName: string;

  @Column({ default: 0 })
  score: number;

  @Column({ default: 0 })
  rank: number;

  @Column({ default: 0 })
  correctAnswers: number;

  @Column({ default: 0 })
  totalQuestions: number;

  @CreateDateColumn()
  createdAt: Date;
}
