import { IsEmail } from 'class-validator';

export class CreateContactEmailDto {
  @IsEmail()
  email: string;
}
