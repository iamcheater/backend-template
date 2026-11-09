import { IsString } from 'class-validator';
import { IsStrongPassword } from 'src/common/validators';

export class ChangeAdminPasswordDto {
  @IsString()
  currentPassword: string;

  @IsStrongPassword()
  newPassword: string;
}
