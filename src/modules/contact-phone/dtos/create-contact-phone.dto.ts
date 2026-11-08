import { IsValidPhone } from 'src/common/validators';

export class CreateContactPhoneDto {
  @IsValidPhone()
  phone: string;
}
