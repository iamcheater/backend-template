import { IsIn, IsOptional, IsString } from 'class-validator';
import { TrimTranslatedText } from 'src/common/transformers';
import { TranslatedTextPatch } from 'src/common/types';
import { IsTranslatedText } from 'src/common/validators';
import { UploadPurpose } from 'src/modules/media/enums';
import { TALK_TO_US_UPLOAD_PURPOSES } from '../utils';

export class UpdateTalkToUsDto {
  @IsOptional()
  @TrimTranslatedText()
  @IsTranslatedText({ partial: true, allowClearingDefault: true })
  title?: TranslatedTextPatch;

  @IsOptional()
  @TrimTranslatedText()
  @IsTranslatedText({ partial: true, allowClearingDefault: true })
  text?: TranslatedTextPatch;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsIn(TALK_TO_US_UPLOAD_PURPOSES)
  purpose?: UploadPurpose;
}
