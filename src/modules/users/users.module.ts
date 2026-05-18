import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Attempt } from '../attempts/entities/attempt.entity';
import { QuizAssignment } from '../assignments/entities/assignment.entity';
import { Class } from '../classes/entities/class.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Attempt, QuizAssignment, Class, Quiz])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
