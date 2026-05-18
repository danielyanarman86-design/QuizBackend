import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Quiz, QuizStatus } from './entities/quiz.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Question } from '../questions/entities/question.entity';
import { AnswerOption } from '../questions/entities/answer-option.entity';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(Quiz) private quizzesRepo: Repository<Quiz>,
    @InjectRepository(Question) private questionsRepo: Repository<Question>,
    @InjectRepository(AnswerOption) private answersRepo: Repository<AnswerOption>,
    private dataSource: DataSource,
  ) {}

  async findAll(user: User) {
    if (user.role === UserRole.TEACHER || user.role === UserRole.SUPER_ADMIN) {
      return this.quizzesRepo.find({
        where: { createdById: user.id },
        relations: ['questions'],
        order: { createdAt: 'DESC' },
      });
    }
    return this.quizzesRepo.find({
      where: { status: QuizStatus.PUBLISHED },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const quiz = await this.quizzesRepo.findOne({
      where: { id },
      relations: ['questions', 'questions.answerOptions'],
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  async create(dto: any, user: User) {
    const { questions: questionsDto, ...quizData } = dto;

    return this.dataSource.transaction(async (manager) => {
      const quiz = manager.create(Quiz, { ...quizData, createdById: user.id });
      const savedQuiz = await manager.save(Quiz, quiz);

      if (questionsDto && Array.isArray(questionsDto)) {
        for (let i = 0; i < questionsDto.length; i++) {
          const { answerOptions: optionsDto, ...questionData } = questionsDto[i];
          const question = manager.create(Question, {
            ...questionData,
            order: i,
            quizId: savedQuiz.id,
          });
          const savedQuestion = await manager.save(Question, question);

          if (optionsDto && Array.isArray(optionsDto)) {
            for (let j = 0; j < optionsDto.length; j++) {
              const option = manager.create(AnswerOption, {
                ...optionsDto[j],
                order: j,
                questionId: savedQuestion.id,
              });
              await manager.save(AnswerOption, option);
            }
          }
        }
      }

      return manager.findOne(Quiz, {
        where: { id: savedQuiz.id },
        relations: ['questions', 'questions.answerOptions'],
      });
    });
  }

  async update(id: string, dto: Partial<Quiz>, user: User) {
    const quiz = await this.quizzesRepo.findOne({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.createdById !== user.id && user.role !== UserRole.SUPER_ADMIN) throw new ForbiddenException();
    await this.quizzesRepo.update(id, dto);
    return this.quizzesRepo.findOne({ where: { id }, relations: ['questions'] });
  }

  async remove(id: string, user: User) {
    const quiz = await this.quizzesRepo.findOne({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.createdById !== user.id && user.role !== UserRole.SUPER_ADMIN) throw new ForbiddenException();
    await this.quizzesRepo.remove(quiz);
    return { message: 'Quiz deleted' };
  }

  async duplicate(id: string, user: User) {
    const quiz = await this.findOne(id);
    return this.dataSource.transaction(async (manager) => {
      const { id: _id, createdAt, updatedAt, questions, ...rest } = quiz as any;
      const newQuiz = manager.create(Quiz, {
        ...rest,
        title: `${quiz.title} (copy)`,
        status: QuizStatus.DRAFT,
        createdById: user.id,
      });
      const savedQuiz = await manager.save(Quiz, newQuiz);

      for (let i = 0; i < (questions || []).length; i++) {
        const { id: _qid, answerOptions, ...qData } = questions[i];
        const newQ = manager.create(Question, { ...qData, quizId: savedQuiz.id });
        const savedQ = await manager.save(Question, newQ);

        for (let j = 0; j < (answerOptions || []).length; j++) {
          const { id: _aid, ...aData } = answerOptions[j];
          await manager.save(AnswerOption, manager.create(AnswerOption, { ...aData, questionId: savedQ.id }));
        }
      }

      return manager.findOne(Quiz, {
        where: { id: savedQuiz.id },
        relations: ['questions', 'questions.answerOptions'],
      });
    });
  }
}
