import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';

@ApiTags('Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private service: AssignmentsService) {}

  @Get()
  findMine(@CurrentUser() user: User) {
    if (user.role === UserRole.STUDENT) return this.service.findForStudent(user);
    return this.service.findForTeacher(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.SUPER_ADMIN)
  create(@Body() dto: any, @CurrentUser() user: User) {
    return this.service.create(dto, user);
  }

  @Get(':id/results')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.SUPER_ADMIN)
  getResults(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.getResults(id, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.remove(id, user);
  }
}
