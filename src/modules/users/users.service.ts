import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, Locale } from './entities/user.entity';
import { Attempt, AttemptStatus } from '../attempts/entities/attempt.entity';
import { QuizAssignment } from '../assignments/entities/assignment.entity';
import { Class } from '../classes/entities/class.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { LiveSessionResult } from '../sessions/entities/live-session-result.entity';

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  preferredLocale?: Locale;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Attempt) private attemptsRepo: Repository<Attempt>,
    @InjectRepository(QuizAssignment) private assignRepo: Repository<QuizAssignment>,
    @InjectRepository(Class) private classRepo: Repository<Class>,
    @InjectRepository(Quiz) private quizRepo: Repository<Quiz>,
    @InjectRepository(LiveSessionResult) private liveResultsRepo: Repository<LiveSessionResult>,
  ) {}

  async findById(id: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(id: string, dto: UpdateUserDto) {
    await this.usersRepo.update(id, dto);
    return this.findById(id);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.usersRepo.findOne({ where: { id }, select: ['id', 'password'] });
    if (!user) throw new NotFoundException('User not found');
    if (!user.password) throw new BadRequestException('Cannot change password for Google accounts');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const hash = await bcrypt.hash(newPassword, 10);
    await this.usersRepo.update(id, { password: hash });
    return { message: 'Password changed successfully' };
  }

  async getDashboard(user: User) {
    if (user.role === UserRole.TEACHER) {
      return this.getTeacherDashboard(user.id);
    }
    return this.getStudentDashboard(user.id);
  }

  private async getTeacherDashboard(teacherId: string) {
    const [classes, quizzes, assignments] = await Promise.all([
      this.classRepo.find({ where: { teacherId }, relations: ['students'] }),
      this.quizRepo.find({ where: { createdById: teacherId }, relations: ['questions'] }),
      this.assignRepo.find({
        where: { assignedById: teacherId },
        relations: ['quiz'],
        order: { assignedAt: 'DESC' },
        take: 5,
      }),
    ]);

    const totalStudents = classes.reduce((s, c) => s + (c.students?.length ?? 0), 0);

    // Top students across all teacher's assignments
    const assignmentIds = assignments.map(a => a.id);
    let topStudents: { name: string; avgPct: number; attempts: number }[] = [];
    if (assignmentIds.length > 0) {
      const attempts = await this.attemptsRepo
        .createQueryBuilder('a')
        .innerJoin('a.student', 'student')
        .select('student.firstName', 'firstName')
        .addSelect('student.lastName', 'lastName')
        .addSelect('COUNT(a.id)', 'attempts')
        .addSelect('AVG(CASE WHEN a.totalPoints > 0 THEN (a.score * 100.0 / a.totalPoints) ELSE 0 END)', 'avgPct')
        .where('a.assignmentId IN (:...ids)', { ids: assignmentIds })
        .andWhere('a.status = :status', { status: AttemptStatus.COMPLETED })
        .groupBy('student.id, student.firstName, student.lastName')
        .orderBy('"avgPct"', 'DESC')
        .limit(5)
        .getRawMany();

      topStudents = attempts.map(r => ({
        name: `${r.firstName} ${r.lastName}`,
        avgPct: Math.round(parseFloat(r.avgPct ?? '0')),
        attempts: parseInt(r.attempts, 10),
      }));
    }

    return {
      role: 'teacher',
      stats: {
        totalClasses: classes.length,
        totalStudents,
        totalQuizzes: quizzes.length,
        totalAssignments: assignments.length,
      },
      recentAssignments: assignments.map(a => ({
        id: a.id,
        quizTitle: a.quiz?.title,
        deadline: a.deadline,
        assignedAt: a.assignedAt,
      })),
      topStudents,
    };
  }

  private async getStudentDashboard(studentId: string) {
    const [attempts, myClasses] = await Promise.all([
      this.attemptsRepo.find({
        where: { studentId, status: AttemptStatus.COMPLETED },
        relations: ['assignment', 'assignment.quiz'],
        order: { finishedAt: 'DESC' },
        take: 10,
      }),
      this.classRepo
        .createQueryBuilder('class')
        .innerJoin('class.students', 'student', 'student.id = :id', { id: studentId })
        .getMany(),
    ]);

    const totalAttempts = attempts.length;
    const avgScore = totalAttempts
      ? Math.round(attempts.reduce((s, a) => s + (a.totalPoints ? (a.score / a.totalPoints) * 100 : 0), 0) / totalAttempts)
      : 0;
    const bestScore = totalAttempts
      ? Math.max(...attempts.map(a => a.totalPoints ? Math.round((a.score / a.totalPoints) * 100) : 0))
      : 0;

    // Pending assignments (not started yet)
    const classIds = myClasses.map(c => c.id);
    let pendingCount = 0;
    if (classIds.length > 0) {
      const allAssignments = await this.assignRepo
        .createQueryBuilder('a')
        .innerJoin('a.classes', 'class', 'class.id IN (:...ids)', { ids: classIds })
        .getMany();

      const completedIds = new Set(attempts.map(a => a.assignmentId));
      pendingCount = allAssignments.filter(a => !completedIds.has(a.id)).length;
    }

    return {
      role: 'student',
      stats: { totalAttempts, avgScore, bestScore, pendingAssignments: pendingCount },
      recentAttempts: attempts.slice(0, 5).map(a => ({
        id: a.id,
        quizTitle: a.assignment?.quiz?.title ?? 'Unknown',
        pct: a.totalPoints ? Math.round((a.score / a.totalPoints) * 100) : 0,
        score: a.score,
        totalPoints: a.totalPoints,
        finishedAt: a.finishedAt,
      })),
    };
  }

  async getMyStats(userId: string) {
    const [attempts, liveResults] = await Promise.all([
      this.attemptsRepo.find({
        where: { studentId: userId, status: AttemptStatus.COMPLETED },
        relations: ['assignment', 'assignment.quiz'],
      }),
      this.liveResultsRepo
        .createQueryBuilder('r')
        .leftJoinAndSelect('r.session', 'session')
        .leftJoinAndSelect('session.assignment', 'assignment')
        .leftJoinAndSelect('assignment.quiz', 'quiz')
        .where('r.userId = :userId', { userId })
        .orderBy('session.finishedAt', 'DESC')
        .limit(20)
        .getMany(),
    ]);

    const totalAttempts = attempts.length;
    const avgScore = totalAttempts
      ? Math.round(attempts.reduce((sum, a) => sum + (a.totalPoints ? (a.score / a.totalPoints) * 100 : 0), 0) / totalAttempts)
      : 0;
    const bestScore = totalAttempts
      ? Math.max(...attempts.map(a => a.totalPoints ? Math.round((a.score / a.totalPoints) * 100) : 0))
      : 0;

    const recentLive = liveResults.map(r => ({
      id: r.id,
      type: 'live' as const,
      quizTitle: (r.session as any)?.assignment?.quiz?.title ?? 'Live Quiz',
      score: r.score,
      rank: r.rank,
      correctAnswers: r.correctAnswers,
      totalQuestions: r.totalQuestions,
      pin: r.session?.pin,
      finishedAt: r.session?.finishedAt,
    }));

    return {
      totalAttempts,
      avgScore,
      bestScore,
      recentAttempts: attempts.slice(-10).reverse().map(a => ({
        id: a.id,
        type: 'assignment' as const,
        quizTitle: a.assignment?.quiz?.title ?? 'Unknown',
        score: a.score,
        totalPoints: a.totalPoints,
        pct: a.totalPoints ? Math.round((a.score / a.totalPoints) * 100) : 0,
        finishedAt: a.finishedAt,
      })),
      recentLive,
    };
  }
}
