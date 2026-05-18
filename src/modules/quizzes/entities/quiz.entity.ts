import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Question } from '../../questions/entities/question.entity';

export enum QuizStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export interface QuizSettings {
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showAnswerAfter: 'question' | 'end';
  maxAttempts: number;
}

@Entity('quizzes')
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  category: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ type: 'enum', enum: QuizStatus, default: QuizStatus.DRAFT })
  status: QuizStatus;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ type: 'jsonb', default: {
    shuffleQuestions: false,
    shuffleAnswers: false,
    showAnswerAfter: 'end',
    maxAttempts: 1,
  }})
  settings: QuizSettings;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column()
  createdById: string;

  @OneToMany(() => Question, (q) => q.quiz, { cascade: true })
  questions: Question[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
