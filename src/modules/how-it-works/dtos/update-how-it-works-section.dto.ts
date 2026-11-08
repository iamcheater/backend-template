import { IsIn, IsOptional, IsString } from 'class-validator';
import { UploadPurpose } from 'src/modules/media/enums';
import { HOW_IT_WORKS_UPLOAD_PURPOSES } from '../utils';

export class UpdateHowItWorksSectionDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsIn(HOW_IT_WORKS_UPLOAD_PURPOSES)
  purpose?: UploadPurpose;
}
