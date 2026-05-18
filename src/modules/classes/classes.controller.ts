import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto, JoinClassDto } from './dto/create-class.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';

@ApiTags('Classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('classes')
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.classesService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  create(@Body() dto: CreateClassDto, @CurrentUser() user: User) {
    return this.classesService.create(dto, user);
  }

  @Post('join')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  join(@Body() dto: JoinClassDto, @CurrentUser() user: User) {
    return this.classesService.join(dto, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.classesService.remove(id, user);
  }
}
