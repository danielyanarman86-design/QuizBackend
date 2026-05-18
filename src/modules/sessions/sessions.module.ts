import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveGateway } from './live.gateway';
import { LiveService } from './live.service';
import { SessionsController } from './sessions.controller';
import { LiveSession } from './entities/live-session.entity';
import { LiveSessionResult } from './entities/live-session-result.entity';
import { QuizAssignment } from '../assignments/entities/assignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LiveSession, LiveSessionResult, QuizAssignment])],
  controllers: [SessionsController],
  providers: [LiveGateway, LiveService],
})
export class SessionsModule {}
