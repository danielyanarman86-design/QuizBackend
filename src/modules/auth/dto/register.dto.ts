import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, Locale } from '../../users/entities/user.entity';

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: [UserRole.TEACHER, UserRole.STUDENT] })
  @IsEnum([UserRole.TEACHER, UserRole.STUDENT])
  role: UserRole;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @ApiProperty({ enum: Locale, required: false })
  @IsOptional()
  @IsEnum(Locale)
  preferredLocale?: Locale;
}
