import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Question } from './question.entity';

@Entity('answer_options')
export class AnswerOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  text: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: false })
  isCorrect: boolean;

  @Column({ default: 0 })
  order: number;

  @ManyToOne(() => Question, (q) => q.answerOptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question: Question;

  @Column()
  questionId: string;
}
