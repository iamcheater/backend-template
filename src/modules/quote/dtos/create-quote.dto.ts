import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PublicSubmissionDto } from 'src/common/dtos';
import { BlankToUndefined, Trim } from 'src/common/transformers';
import { IsValidPhone } from 'src/common/validators';
import { KindOfClean, PreferredTiming } from '../enums';

export class CreateQuoteDto extends PublicSubmissionDto {
  @IsEnum(KindOfClean)
  kindOfClean: KindOfClean;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Trim()
  @IsValidPhone()
  phone: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  area: string;

  @BlankToUndefined()
  @IsOptional()
  @IsEnum(PreferredTiming)
  preferredTiming?: PreferredTiming;

  @BlankToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
