import { IsBoolean, IsOptional } from 'class-validator';
import { IsValidPhone } from 'src/common/validators';

export class UpdateContactPhoneDto {
  @IsOptional()
  @IsValidPhone()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
