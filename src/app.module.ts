import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { AdminModule } from './modules/admin/admin.module';
import { ClassesModule } from './modules/classes/classes.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AttemptsModule } from './modules/attempts/attempts.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { User } from './modules/users/entities/user.entity';
import { School } from './modules/schools/entities/school.entity';
import { Class } from './modules/classes/entities/class.entity';
import { Quiz } from './modules/quizzes/entities/quiz.entity';
import { Question } from './modules/questions/entities/question.entity';
import { AnswerOption } from './modules/questions/entities/answer-option.entity';
import { QuizAssignment } from './modules/assignments/entities/assignment.entity';
import { LiveSession } from './modules/sessions/entities/live-session.entity';
import { LiveSessionResult } from './modules/sessions/entities/live-session-result.entity';
import { Attempt } from './modules/attempts/entities/attempt.entity';
import { StudentAnswer } from './modules/attempts/entities/student-answer.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.database'),
        entities: [
          User, School, Class, Quiz, Question, AnswerOption,
          QuizAssignment, LiveSession, LiveSessionResult, Attempt, StudentAnswer,
        ],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    UsersModule,
    SchoolsModule,
    AdminModule,
    ClassesModule,
    QuizzesModule,
    AssignmentsModule,
    AttemptsModule,
    SessionsModule,
  ],
})
export class AppModule {}
