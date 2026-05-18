import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';
import { Attempt } from './entities/attempt.entity';
import { StudentAnswer } from './entities/student-answer.entity';
import { QuizAssignment } from '../assignments/entities/assignment.entity';
import { Question } from '../questions/entities/question.entity';
import { AnswerOption } from '../questions/entities/answer-option.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Attempt, StudentAnswer, QuizAssignment, Question, AnswerOption])],
  controllers: [AttemptsController],
  providers: [AttemptsService],
  exports: [AttemptsService],
})
export class AttemptsModule {}
