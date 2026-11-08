import { IsBoolean, IsEmail, IsOptional } from 'class-validator';

export class UpdateContactEmailDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
