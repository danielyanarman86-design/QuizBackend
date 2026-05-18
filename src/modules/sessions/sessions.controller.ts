import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { LiveSession } from './entities/live-session.entity';
import { LiveSessionResult } from './entities/live-session-result.entity';
import { QuizAssignment } from '../assignments/entities/assignment.entity';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(
    @InjectRepository(LiveSession) private sessionsRepo: Repository<LiveSession>,
    @InjectRepository(LiveSessionResult) private resultsRepo: Repository<LiveSessionResult>,
    @InjectRepository(QuizAssignment) private assignRepo: Repository<QuizAssignment>,
  ) {}

  @Get('history')
  async getHistory(@CurrentUser() user: User) {
    const sessions = await this.sessionsRepo
      .createQueryBuilder('s')
      .innerJoin('s.assignment', 'a')
      .innerJoin('a.quiz', 'q')
      .where('a.assignedById = :uid', { uid: user.id })
      .andWhere('s.status = :status', { status: 'finished' })
      .select([
        's.id', 's.pin', 's.startedAt', 's.finishedAt',
        'a.id', 'q.title',
      ])
      .orderBy('s.startedAt', 'DESC')
      .limit(50)
      .getRawMany();

    return sessions.map(r => ({
      id: r.s_id,
      pin: r.s_pin,
      quizTitle: r.q_title,
      startedAt: r.s_startedAt,
      finishedAt: r.s_finishedAt,
    }));
  }

  @Get(':sessionId/results')
  async getSessionResults(@Param('sessionId') sessionId: string) {
    return this.resultsRepo.find({
      where: { sessionId },
      order: { rank: 'ASC' },
    });
  }
}
