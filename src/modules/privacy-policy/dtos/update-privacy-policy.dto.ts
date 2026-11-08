import { IsOptional } from 'class-validator';
import { TrimTranslatedText } from 'src/common/transformers';
import { TranslatedTextPatch } from 'src/common/types';
import { IsTranslatedText } from 'src/common/validators';

export class UpdatePrivacyPolicyDto {
  @IsOptional()
  @TrimTranslatedText()
  @IsTranslatedText({ partial: true, allowClearingDefault: true })
  content?: TranslatedTextPatch;
}
