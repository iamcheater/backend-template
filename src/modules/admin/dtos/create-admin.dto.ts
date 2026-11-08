import { IsEmail, IsOptional, IsString } from 'class-validator';
import { IsStrongPassword } from 'src/common/validators';

export class CreateAdminDto {
  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  @IsOptional()
  @IsString()
  name?: string;
}
