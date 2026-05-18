import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { QuizAssignment, AssignmentMode } from './entities/assignment.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Class } from '../classes/entities/class.entity';
import { Attempt, AttemptStatus } from '../attempts/entities/attempt.entity';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(QuizAssignment) private repo: Repository<QuizAssignment>,
    @InjectRepository(Class) private classRepo: Repository<Class>,
    @InjectRepository(Attempt) private attemptsRepo: Repository<Attempt>,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}

  async create(dto: { quizId: string; classIds: string[]; deadline?: string }, user: User) {
    const classes = await this.classRepo.findBy({ id: In(dto.classIds) });
    const assignment = this.repo.create({
      quizId: dto.quizId,
      mode: AssignmentMode.ASYNC,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      assignedById: user.id,
      classes,
    });
    return this.repo.save(assignment);
  }

  async findForStudent(user: User) {
    // Find all classes the student is in, then find assignments for those classes
    const myClasses = await this.classRepo
      .createQueryBuilder('class')
      .innerJoin('class.students', 'student', 'student.id = :userId', { userId: user.id })
      .getMany();

    if (!myClasses.length) return [];

    const classIds = myClasses.map(c => c.id);

    return this.repo
      .createQueryBuilder('a')
      .innerJoin('a.classes', 'class', 'class.id IN (:...classIds)', { classIds })
      .leftJoinAndSelect('a.quiz', 'quiz')
      .leftJoinAndSelect('quiz.questions', 'questions')
      .orderBy('a.assignedAt', 'DESC')
      .getMany();
  }

  async findForTeacher(user: User) {
    return this.repo.find({
      where: { assignedById: user.id },
      relations: ['quiz', 'classes'],
      order: { assignedAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const a = await this.repo.findOne({
      where: { id },
      relations: ['quiz', 'quiz.questions', 'quiz.questions.answerOptions', 'classes'],
    });
    if (!a) throw new NotFoundException('Assignment not found');
    return a;
  }

  async remove(id: string, user: User) {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new NotFoundException();
    if (a.assignedById !== user.id && user.role !== UserRole.SUPER_ADMIN) throw new ForbiddenException();
    await this.repo.remove(a);
    return { message: 'Deleted' };
  }

  async getResults(assignmentId: string, user: User) {
    const assignment = await this.repo.findOne({
      where: { id: assignmentId },
      relations: ['quiz', 'quiz.questions', 'classes', 'classes.students'],
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.assignedById !== user.id && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException();
    }

    // All students in the assigned classes
    const studentMap = new Map<string, { id: string; firstName: string; lastName: string; email: string }>();
    for (const cls of assignment.classes) {
      for (const student of (cls.students || [])) {
        studentMap.set(student.id, student);
      }
    }

    const studentIds = [...studentMap.keys()];
    const totalPoints = assignment.quiz.questions.reduce((s, q) => s + q.points, 0);

    const attempts = studentIds.length
      ? await this.attemptsRepo.find({
          where: { assignmentId, studentId: In(studentIds) },
          order: { startedAt: 'DESC' },
        })
      : [];

    // Latest attempt per student
    const latestAttempt = new Map<string, Attempt>();
    for (const attempt of attempts) {
      if (!latestAttempt.has(attempt.studentId)) {
        latestAttempt.set(attempt.studentId, attempt);
      }
    }

    const rows = [...studentMap.values()].map(student => {
      const attempt = latestAttempt.get(student.id);
      return {
        student: { id: student.id, firstName: student.firstName, lastName: student.lastName, email: student.email },
        status: attempt?.status ?? 'notStarted',
        score: attempt?.score ?? null,
        totalPoints,
        pct: attempt?.status === AttemptStatus.COMPLETED && totalPoints > 0
          ? Math.round((attempt.score / totalPoints) * 100)
          : null,
        finishedAt: attempt?.finishedAt ?? null,
      };
    });

    const completed = rows.filter(r => r.status === AttemptStatus.COMPLETED).length;
    const avgPct = completed > 0
      ? Math.round(rows.filter(r => r.pct !== null).reduce((s, r) => s + r.pct!, 0) / completed)
      : 0;

    return {
      assignment: { id: assignment.id, quiz: { title: assignment.quiz.title }, deadline: assignment.deadline },
      totalStudents: studentMap.size,
      completed,
      avgPct,
      rows,
    };
  }
}
