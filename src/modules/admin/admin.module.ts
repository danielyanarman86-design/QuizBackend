import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { User } from '../users/entities/user.entity';
import { School } from '../schools/entities/school.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { Attempt } from '../attempts/entities/attempt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, School, Quiz, Attempt])],
  controllers: [AdminController],
})
export class AdminModule {}
