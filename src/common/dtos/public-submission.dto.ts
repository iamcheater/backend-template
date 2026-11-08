import {
  Equals,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SubmissionLanguage } from 'src/common/enums';
import { BlankToUndefined, Trim } from 'src/common/transformers';

export abstract class PublicSubmissionDto {
  @Equals(true)
  consentAccepted: boolean;

  @IsEnum(SubmissionLanguage)
  language: SubmissionLanguage;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sourcePage: string;

  @BlankToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  pageUrl?: string;

  @BlankToUndefined()
  @IsOptional()
  @IsString()
  website?: string;
}
