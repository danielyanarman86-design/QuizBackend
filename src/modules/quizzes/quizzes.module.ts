import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';
import { Quiz } from './entities/quiz.entity';
import { Question } from '../questions/entities/question.entity';
import { AnswerOption } from '../questions/entities/answer-option.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz, Question, AnswerOption])],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService],
})
export class QuizzesModule {}
