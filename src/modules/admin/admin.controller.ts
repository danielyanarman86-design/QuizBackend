import { Controller, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { School } from '../schools/entities/school.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { Attempt } from '../attempts/entities/attempt.entity';

class UpdateStatusDto {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  status: UserStatus;
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(School) private schoolsRepo: Repository<School>,
    @InjectRepository(Quiz) private quizzesRepo: Repository<Quiz>,
    @InjectRepository(Attempt) private attemptsRepo: Repository<Attempt>,
  ) {}

  @Get('stats')
  async getStats() {
    const [totalUsers, totalSchools, totalQuizzes, pendingTeachers] = await Promise.all([
      this.usersRepo.count({ where: { role: UserRole.TEACHER } }),
      this.schoolsRepo.count(),
      this.quizzesRepo.count(),
      this.usersRepo.count({ where: { role: UserRole.TEACHER, status: UserStatus.PENDING } }),
    ]);
    return { totalUsers, totalSchools, totalQuizzes, pendingTeachers };
  }

  @Get('statistics')
  async getStatistics() {
    const [totalSchools, totalQuizzes, pendingTeachers, teachers, students,
      activeUsers, pendingUsers, bannedUsers, totalAttempts, avgScoreResult] = await Promise.all([
      this.schoolsRepo.count(),
      this.quizzesRepo.count(),
      this.usersRepo.count({ where: { role: UserRole.TEACHER, status: UserStatus.PENDING } }),
      this.usersRepo.count({ where: { role: UserRole.TEACHER } }),
      this.usersRepo.count({ where: { role: UserRole.STUDENT } }),
      this.usersRepo.count({ where: { status: UserStatus.ACTIVE } }),
      this.usersRepo.count({ where: { status: UserStatus.PENDING } }),
      this.usersRepo.count({ where: { status: UserStatus.BANNED } }),
      this.attemptsRepo.count({ where: { status: 'completed' as any } }),
      this.attemptsRepo
        .createQueryBuilder('a')
        .select('AVG(CASE WHEN a.totalPoints > 0 THEN (a.score * 100.0 / a.totalPoints) ELSE 0 END)', 'avg')
        .where('a.status = :status', { status: 'completed' })
        .andWhere('a.totalPoints > 0')
        .getRawOne(),
    ]);

    const avgScore = Math.round(parseFloat(avgScoreResult?.avg ?? '0') * 10) / 10;

    return {
      totalUsers: teachers + students,
      totalSchools,
      totalQuizzes,
      pendingTeachers,
      totalAttempts,
      avgScore,
      byRole: { teachers, students },
      byStatus: { active: activeUsers, pending: pendingUsers, banned: bannedUsers },
    };
  }

  @Get('users')
  getUsers() {
    return this.usersRepo.find({
      relations: ['school'],
      order: { createdAt: 'DESC' },
      where: [{ role: UserRole.TEACHER }, { role: UserRole.STUDENT }],
    });
  }

  @Patch('users/:id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    await this.usersRepo.update(id, { status: dto.status });
    return this.usersRepo.findOne({ where: { id }, relations: ['school'] });
  }

  @Get('quizzes')
  getQuizzes() {
    return this.quizzesRepo.find({
      relations: ['createdBy', 'questions'],
      order: { createdAt: 'DESC' },
    });
  }

  @Delete('quizzes/:id')
  async deleteQuiz(@Param('id') id: string) {
    const quiz = await this.quizzesRepo.findOne({ where: { id } });
    if (quiz) await this.quizzesRepo.remove(quiz);
    return { message: 'Quiz deleted' };
  }
}
