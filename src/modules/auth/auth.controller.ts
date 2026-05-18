import {
  Controller, Post, Get, Body, UseGuards, Req, Res, Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth' })
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(
    @Req() req: any,
    @Res() res: any,
    @Query('schoolId') schoolId?: string,
    @Query('role') role?: UserRole,
  ) {
    const result = await this.authService.googleLogin(req.user, schoolId, role);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (result.needsCompletion) {
      return res.redirect(`${frontendUrl}/hy/auth/complete-profile`);
    }

    return res.redirect(
      `${frontendUrl}/hy/auth/callback?token=${result.accessToken}`,
    );
  }
}
