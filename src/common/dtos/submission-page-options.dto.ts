import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SortOrder, SubmissionLanguage } from 'src/common/enums';
import { BlankToUndefined } from 'src/common/transformers';
import { PageOptionsDto } from './page-options.dto';

export class SubmissionPageOptionsDto extends PageOptionsDto {
  @IsEnum(SortOrder)
  @IsOptional()
  readonly order?: SortOrder = SortOrder.DESC;

  @BlankToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;

  @IsOptional()
  @IsEnum(SubmissionLanguage)
  readonly language?: SubmissionLanguage;

  @IsOptional()
  @IsDateString({ strict: true })
  readonly createdFrom?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  readonly createdTo?: string;
}
