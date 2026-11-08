import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PublicSubmissionDto } from 'src/common/dtos';
import { BlankToUndefined, Trim } from 'src/common/transformers';
import { IsValidPhone } from 'src/common/validators';
import {
  Availability,
  CleanerSkill,
  CleaningExperience,
  SuppliesAnswer,
} from '../enums';

export class CreateCleanerDto extends PublicSubmissionDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @Trim()
  @IsValidPhone()
  phone: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  cityArea: string;

  @IsEnum(CleaningExperience)
  cleaningExperience: CleaningExperience;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(Availability, { each: true })
  availability: Availability[];

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(CleanerSkill, { each: true })
  servicesCanDo: CleanerSkill[];

  @IsEnum(SuppliesAnswer)
  hasOwnSupplies: SuppliesAnswer;

  @BlankToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
