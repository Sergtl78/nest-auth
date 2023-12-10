import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;
}
