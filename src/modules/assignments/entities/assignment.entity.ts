import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  ManyToMany, JoinTable, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Quiz } from '../../quizzes/entities/quiz.entity';
import { Class } from '../../classes/entities/class.entity';
import { User } from '../../users/entities/user.entity';

export enum AssignmentMode {
  ASYNC = 'async',
  LIVE = 'live',
}

@Entity('quiz_assignments')
export class QuizAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Quiz, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizId' })
  quiz: Quiz;

  @Column()
  quizId: string;

  @ManyToMany(() => Class)
  @JoinTable({
    name: 'assignment_classes',
    joinColumn: { name: 'assignmentId' },
    inverseJoinColumn: { name: 'classId' },
  })
  classes: Class[];

  @Column({ type: 'enum', enum: AssignmentMode })
  mode: AssignmentMode;

  @Column({ nullable: true })
  deadline: Date;

  @Column({ nullable: true, default: null })
  maxPlayers: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignedById' })
  assignedBy: User;

  @Column()
  assignedById: string;

  @CreateDateColumn()
  assignedAt: Date;
}
