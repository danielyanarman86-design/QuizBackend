import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  OneToMany, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Quiz } from '../../quizzes/entities/quiz.entity';
import { AnswerOption } from './answer-option.entity';

export enum QuestionType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
  TRUE_FALSE = 'truefalse',
  OPEN = 'open',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  text: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'enum', enum: QuestionType })
  type: QuestionType;

  @Column({ nullable: true })
  timeLimit: number;

  @Column({ default: 0 })
  order: number;

  @Column({ default: 1 })
  points: number;

  @ManyToOne(() => Quiz, (quiz) => quiz.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizId' })
  quiz: Quiz;

  @Column()
  quizId: string;

  @OneToMany(() => AnswerOption, (a) => a.question, { cascade: true })
  answerOptions: AnswerOption[];

  @CreateDateColumn()
  createdAt: Date;
}
