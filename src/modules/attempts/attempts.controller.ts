import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AttemptsService } from './attempts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@ApiTags('Attempts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attempts')
export class AttemptsController {
  constructor(private service: AttemptsService) {}

  @Get()
  getMyAttempts(@CurrentUser() user: User) {
    return this.service.getMyAttempts(user);
  }

  @Post('start')
  start(@Body() dto: { assignmentId: string }, @CurrentUser() user: User) {
    return this.service.start(dto.assignmentId, user);
  }

  @Post(':id/answer')
  submitAnswer(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: User) {
    return this.service.submitAnswer(id, dto, user);
  }

  @Post(':id/finish')
  finish(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.finish(id, user);
  }

  @Get(':id/result')
  getResult(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.getResult(id, user);
  }

  @Get('assignment/:assignmentId/open-answers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.SUPER_ADMIN)
  getOpenAnswers(@Param('assignmentId') assignmentId: string) {
    return this.service.getOpenAnswers(assignmentId);
  }

  @Patch('answers/:answerId/grade')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.SUPER_ADMIN)
  gradeAnswer(@Param('answerId') answerId: string, @Body() dto: { isCorrect: boolean }) {
    return this.service.gradeOpenAnswer(answerId, dto.isCorrect);
  }
}
