import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { SubmissionPageOptionsDto } from 'src/common/dtos';
import {
  Availability,
  CleanerSkill,
  CleanerStatus,
  CleaningExperience,
} from '../enums';

const BOOLEAN_QUERY_VALUES: Record<string, boolean> = {
  true: true,
  false: false,
};

export class CleanerPageOptionsDto extends SubmissionPageOptionsDto {
  @IsOptional()
  @IsEnum(CleanerStatus)
  readonly status?: CleanerStatus;

  @IsOptional()
  @IsEnum(CleaningExperience)
  readonly cleaningExperience?: CleaningExperience;

  @IsOptional()
  @IsEnum(CleanerSkill)
  readonly skill?: CleanerSkill;

  @IsOptional()
  @IsEnum(Availability)
  readonly availability?: Availability;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value in BOOLEAN_QUERY_VALUES
      ? BOOLEAN_QUERY_VALUES[value]
      : value,
  )
  @IsOptional()
  @IsBoolean()
  readonly hasOwnSupplies?: boolean;
}
