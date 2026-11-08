import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { SubmissionPageOptionsDto } from 'src/common/dtos';
import { KindOfClean, PreferredTiming, QuoteAssignment } from '../enums';

export class QuotePageOptionsDto extends SubmissionPageOptionsDto {
  @IsOptional()
  @IsEnum(KindOfClean)
  readonly kindOfClean?: KindOfClean;

  @IsOptional()
  @IsEnum(PreferredTiming)
  readonly preferredTiming?: PreferredTiming;

  @IsOptional()
  @IsEnum(QuoteAssignment)
  readonly assignment?: QuoteAssignment;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  readonly cleanerId?: number;
}
