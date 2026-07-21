import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@nodeguard.ai' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  first_name: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  last_name: string;
}
