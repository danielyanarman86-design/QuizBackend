import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Attempt, AttemptStatus } from './entities/attempt.entity';
import { StudentAnswer } from './entities/student-answer.entity';
import { QuizAssignment } from '../assignments/entities/assignment.entity';
import { Question } from '../questions/entities/question.entity';
import { AnswerOption } from '../questions/entities/answer-option.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AttemptsService {
  constructor(
    @InjectRepository(Attempt) private attemptsRepo: Repository<Attempt>,
    @InjectRepository(StudentAnswer) private answersRepo: Repository<StudentAnswer>,
    @InjectRepository(QuizAssignment) private assignRepo: Repository<QuizAssignment>,
    @InjectRepository(Question) private questionsRepo: Repository<Question>,
    @InjectRepository(AnswerOption) private optionsRepo: Repository<AnswerOption>,
    private dataSource: DataSource,
  ) {}

  async start(assignmentId: string, user: User) {
    const assignment = await this.assignRepo.findOne({
      where: { id: assignmentId },
      relations: ['quiz', 'quiz.questions'],
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const existing = await this.attemptsRepo.findOne({
      where: { assignmentId, studentId: user.id, status: AttemptStatus.IN_PROGRESS },
    });
    if (existing) return existing;

    const attempt = this.attemptsRepo.create({
      assignmentId,
      studentId: user.id,
      status: AttemptStatus.IN_PROGRESS,
      score: 0,
      totalPoints: assignment.quiz.questions.reduce((s, q) => s + q.points, 0),
    });
    return this.attemptsRepo.save(attempt);
  }

  async submitAnswer(attemptId: string, dto: {
    questionId: string;
    selectedOptionIds?: string[];
    openText?: string;
    timeSpent?: number;
  }, user: User) {
    const attempt = await this.attemptsRepo.findOne({ where: { id: attemptId, studentId: user.id } });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.status === AttemptStatus.COMPLETED) throw new BadRequestException('Attempt already completed');

    const question = await this.questionsRepo.findOne({
      where: { id: dto.questionId },
      relations: ['answerOptions'],
    });
    if (!question) throw new NotFoundException('Question not found');

    let isCorrect = false;

    if (question.type === 'open') {
      isCorrect = false; // open questions graded manually
    } else if (dto.selectedOptionIds?.length) {
      const correctIds = question.answerOptions.filter(o => o.isCorrect).map(o => o.id).sort();
      const selectedIds = [...dto.selectedOptionIds].sort();
      isCorrect = JSON.stringify(correctIds) === JSON.stringify(selectedIds);
    }

    const existing = await this.answersRepo.findOne({ where: { attemptId, questionId: dto.questionId } });
    if (existing) {
      existing.selectedOptionIds = dto.selectedOptionIds || [];
      if (dto.openText !== undefined) (existing as any).openText = dto.openText;
      existing.isCorrect = isCorrect;
      if (dto.timeSpent !== undefined) (existing as any).timeSpent = dto.timeSpent;
      return this.answersRepo.save(existing);
    }

    const answer = this.answersRepo.create({
      attemptId,
      questionId: dto.questionId,
      selectedOptionIds: dto.selectedOptionIds || [],
      openText: dto.openText,
      isCorrect,
      timeSpent: dto.timeSpent,
    });
    return this.answersRepo.save(answer);
  }

  async finish(attemptId: string, user: User) {
    const attempt = await this.attemptsRepo.findOne({
      where: { id: attemptId, studentId: user.id },
      relations: ['answers'],
    });
    if (!attempt) throw new NotFoundException('Attempt not found');

    const answers = await this.answersRepo.find({ where: { attemptId } });
    const score = answers.reduce((sum, a) => {
      if (!a.isCorrect) return sum;
      // look up question points
      return sum; // will fix below
    }, 0);

    // Get correct answers with points
    const correctAnswers = answers.filter(a => a.isCorrect);
    let totalScore = 0;
    for (const ans of correctAnswers) {
      const q = await this.questionsRepo.findOne({ where: { id: ans.questionId } });
      if (q) totalScore += q.points;
    }

    attempt.status = AttemptStatus.COMPLETED;
    attempt.score = totalScore;
    attempt.finishedAt = new Date();
    return this.attemptsRepo.save(attempt);
  }

  async getResult(attemptId: string, user: User) {
    const attempt = await this.attemptsRepo.findOne({
      where: { id: attemptId, studentId: user.id },
      relations: ['answers'],
    });
    if (!attempt) throw new NotFoundException();

    const assignment = await this.assignRepo.findOne({
      where: { id: attempt.assignmentId },
      relations: ['quiz', 'quiz.questions', 'quiz.questions.answerOptions'],
    });

    const answers = await this.answersRepo.find({ where: { attemptId } });

    return {
      attempt,
      quiz: assignment?.quiz,
      answers,
      pct: attempt.totalPoints ? Math.round((attempt.score / attempt.totalPoints) * 100) : 0,
    };
  }

  async getMyAttempts(user: User) {
    return this.attemptsRepo.find({
      where: { studentId: user.id },
      relations: ['assignment', 'assignment.quiz'],
      order: { startedAt: 'DESC' },
    });
  }

  async getOpenAnswers(assignmentId: string) {
    const attempts = await this.attemptsRepo.find({
      where: { assignmentId },
      relations: ['student'],
    });

    const results: any[] = [];
    for (const attempt of attempts) {
      const allAnswers = await this.answersRepo.find({
        where: { attemptId: attempt.id },
        relations: ['question'],
      });
      const open = allAnswers.filter(a => a.question?.type === 'open' && a.openText);
      if (open.length > 0) {
        results.push({
          attemptId: attempt.id,
          student: {
            id: attempt.student?.id,
            firstName: attempt.student?.firstName,
            lastName: attempt.student?.lastName,
          },
          answers: open.map(a => ({
            answerId: a.id,
            questionText: a.question?.text,
            openText: a.openText,
            isCorrect: a.isCorrect,
            points: a.question?.points,
          })),
        });
      }
    }
    return results;
  }

  async gradeOpenAnswer(answerId: string, isCorrect: boolean) {
    const answer = await this.answersRepo.findOne({ where: { id: answerId } });
    if (!answer) throw new NotFoundException('Answer not found');

    answer.isCorrect = isCorrect;
    await this.answersRepo.save(answer);

    const allAnswers = await this.answersRepo.find({ where: { attemptId: answer.attemptId } });
    let totalScore = 0;
    for (const ans of allAnswers.filter(a => a.isCorrect)) {
      const q = await this.questionsRepo.findOne({ where: { id: ans.questionId } });
      if (q) totalScore += q.points;
    }
    await this.attemptsRepo.update(answer.attemptId, { score: totalScore });

    return { success: true };
  }
}
