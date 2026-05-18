import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';

@ApiTags('Schools')
@Controller('schools')
export class SchoolsController {
  constructor(private schoolsService: SchoolsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all schools (public)' })
  findAll() {
    return this.schoolsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get school by id' })
  findOne(@Param('id') id: string) {
    return this.schoolsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create school (superAdmin only)' })
  create(@Body() dto: CreateSchoolDto, @CurrentUser() user: User) {
    return this.schoolsService.create(dto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update school (superAdmin only)' })
  update(@Param('id') id: string, @Body() dto: CreateSchoolDto) {
    return this.schoolsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete school (superAdmin only)' })
  remove(@Param('id') id: string) {
    return this.schoolsService.remove(id);
  }
}
