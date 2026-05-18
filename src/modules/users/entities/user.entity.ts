import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { School } from '../../schools/entities/school.entity';

export enum UserRole {
  SUPER_ADMIN = 'superAdmin',
  TEACHER = 'teacher',
  STUDENT = 'student',
}

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  REJECTED = 'rejected',
  BANNED = 'banned',
}

export enum Locale {
  HY = 'hy',
  RU = 'ru',
  EN = 'en',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true, select: false })
  password: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'enum', enum: Locale, default: Locale.HY })
  preferredLocale: Locale;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  avatarColor: string;

  @Column({ nullable: true })
  googleId: string;

  @ManyToOne(() => School, (school) => school.users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'schoolId' })
  school: School;

  @Column({ nullable: true })
  schoolId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
