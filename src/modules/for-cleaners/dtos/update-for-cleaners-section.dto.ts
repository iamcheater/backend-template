import { IsIn, IsOptional, IsString } from 'class-validator';
import { TrimTranslatedText } from 'src/common/transformers';
import { TranslatedTextPatch } from 'src/common/types';
import { IsTranslatedText } from 'src/common/validators';
import { UploadPurpose } from 'src/modules/media/enums';
import { FOR_CLEANERS_UPLOAD_PURPOSES } from '../utils';

export class UpdateForCleanersSectionDto {
  @IsOptional()
  @TrimTranslatedText()
  @IsTranslatedText({ partial: true, allowClearingDefault: true })
  title?: TranslatedTextPatch;

  @IsOptional()
  @TrimTranslatedText()
  @IsTranslatedText({ partial: true, allowClearingDefault: true })
  description?: TranslatedTextPatch;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsIn(FOR_CLEANERS_UPLOAD_PURPOSES)
  purpose?: UploadPurpose;
}
