import { IsIn, IsOptional, IsString } from 'class-validator';
import { TrimTranslatedText } from 'src/common/transformers';
import { TranslatedTextPatch } from 'src/common/types';
import { IsTranslatedText } from 'src/common/validators';
import { UploadPurpose } from 'src/modules/media/enums';
import { STANDARDS_UPLOAD_PURPOSES } from '../utils';

export class UpdateStandardsDto {
  @IsOptional()
  @TrimTranslatedText()
  @IsTranslatedText({ partial: true, allowClearingDefault: true })
  text?: TranslatedTextPatch;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsIn(STANDARDS_UPLOAD_PURPOSES)
  purpose?: UploadPurpose;
}
