import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateClassDto {
  @IsString() @IsNotEmpty()
  name: string;

  @IsOptional() @IsString()
  description?: string;
}

export class JoinClassDto {
  @IsString() @IsNotEmpty()
  inviteCode: string;
}
