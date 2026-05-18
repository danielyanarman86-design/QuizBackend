import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';
import { Quiz } from './entities/quiz.entity';

@ApiTags('Quizzes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quizzes')
export class QuizzesController {
  constructor(private quizzesService: QuizzesService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.quizzesService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quizzesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.SUPER_ADMIN)
  create(@Body() dto: any, @CurrentUser() user: User) {
    return this.quizzesService.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<Quiz>, @CurrentUser() user: User) {
    return this.quizzesService.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.quizzesService.remove(id, user);
  }

  @Post(':id/duplicate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.SUPER_ADMIN)
  duplicate(@Param('id') id: string, @CurrentUser() user: User) {
    return this.quizzesService.duplicate(id, user);
  }
}
