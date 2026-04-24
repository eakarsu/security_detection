import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  token: string;
}

export class ResendVerificationDto {
  @ApiProperty({ example: 'user@nodeguard.ai' })
  @IsEmail()
  email: string;
}
