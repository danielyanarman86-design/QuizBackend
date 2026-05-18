import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import type { UpdateUserDto } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @Patch('me')
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Post('me/change-password')
  changePassword(@CurrentUser() user: User, @Body() dto: { currentPassword: string; newPassword: string }) {
    return this.usersService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: User) {
    return this.usersService.getDashboard(user);
  }

  @Get('statistics/me')
  getMyStats(@CurrentUser() user: User) {
    return this.usersService.getMyStats(user.id);
  }
}
