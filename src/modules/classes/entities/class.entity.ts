import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, ManyToMany, JoinTable, JoinColumn, OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { School } from '../../schools/entities/school.entity';

@Entity('classes')
export class Class {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ unique: true, length: 8 })
  inviteCode: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @Column()
  teacherId: string;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schoolId' })
  school: School;

  @Column()
  schoolId: string;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'class_students',
    joinColumn: { name: 'classId' },
    inverseJoinColumn: { name: 'studentId' },
  })
  students: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
