import {
  Injectable, ConflictException, UnauthorizedException,
  BadRequestException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus, Locale } from '../users/entities/user.entity';
import { School } from '../schools/entities/school.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

type GoogleLoginResult =
  | { needsCompletion: true; googleUser: any }
  | { needsCompletion: false; accessToken: string; user: ReturnType<AuthService['buildUserResponse']> };

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(School) private schoolsRepo: Repository<School>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const school = await this.schoolsRepo.findOne({ where: { id: dto.schoolId } });
    if (!school) throw new NotFoundException('School not found');

    const hash = await bcrypt.hash(dto.password, 10);
    const avatarColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
    const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const newUser = this.usersRepo.create({
      ...dto,
      password: hash,
      avatarColor,
      status: dto.role === UserRole.TEACHER ? UserStatus.PENDING : UserStatus.ACTIVE,
      preferredLocale: dto.preferredLocale || Locale.HY,
    });

    const saved = await this.usersRepo.save(newUser);

    if (dto.role === UserRole.TEACHER) {
      return { message: 'Registration successful. Waiting for admin approval.' };
    }

    return this.generateTokenResponse(saved);
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'password', 'role', 'status', 'firstName', 'lastName', 'avatar', 'avatarColor', 'preferredLocale', 'schoolId'],
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.password) throw new BadRequestException('Please use Google login');
    if (user.status === UserStatus.PENDING) throw new UnauthorizedException('Account pending approval');
    if (user.status === UserStatus.REJECTED) throw new UnauthorizedException('Account rejected');
    if (user.status === UserStatus.BANNED) throw new UnauthorizedException('Account banned');

    const valid = await bcrypt.compare(dto.password, user.password);
    console.log('LOGIN DEBUG:', { email: dto.email, hashLen: user.password?.length, valid });
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokenResponse(user);
  }

  async googleLogin(googleUser: any, schoolId?: string, role?: UserRole): Promise<GoogleLoginResult> {
    let found = await this.usersRepo.findOne({ where: { googleId: googleUser.googleId } });

    if (!found) {
      found = await this.usersRepo.findOne({ where: { email: googleUser.email } });
    }

    if (!found) {
      if (!schoolId || !role) {
        return { needsCompletion: true, googleUser };
      }

      const avatarColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
      const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

      const newUser = this.usersRepo.create({
        ...googleUser,
        role,
        schoolId,
        avatarColor,
        status: role === UserRole.TEACHER ? UserStatus.PENDING : UserStatus.ACTIVE,
        preferredLocale: Locale.HY,
      });

      found = await this.usersRepo.save(newUser) as unknown as User;
    }

    return { needsCompletion: false, ...this.generateTokenResponse(found as User) };
  }

  buildUserResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
      avatarColor: user.avatarColor,
      preferredLocale: user.preferredLocale,
      schoolId: user.schoolId,
    };
  }

  private generateTokenResponse(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: this.buildUserResponse(user),
    };
  }
}
