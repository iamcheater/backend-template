import { IsEnum } from 'class-validator';
import { CleanerStatus } from '../enums';

export class UpdateCleanerStatusDto {
  @IsEnum(CleanerStatus)
  status: CleanerStatus;
}
