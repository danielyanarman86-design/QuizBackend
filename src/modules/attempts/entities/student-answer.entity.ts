import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Attempt } from './attempt.entity';
import { Question } from '../../questions/entities/question.entity';

@Entity('student_answers')
export class StudentAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Attempt, (a) => a.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attemptId' })
  attempt: Attempt;

  @Column()
  attemptId: string;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question: Question;

  @Column()
  questionId: string;

  @Column('simple-array', { nullable: true })
  selectedOptionIds: string[];

  @Column({ nullable: true })
  openText: string;

  @Column({ default: false })
  isCorrect: boolean;

  @Column({ nullable: true })
  timeSpent: number;

  @CreateDateColumn()
  answeredAt: Date;
}
