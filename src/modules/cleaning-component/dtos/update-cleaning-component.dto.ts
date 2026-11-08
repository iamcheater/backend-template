import { IsOptional } from 'class-validator';
import { TrimTranslatedText } from 'src/common/transformers';
import { TranslatedTextPatch } from 'src/common/types';
import { IsTranslatedText } from 'src/common/validators';

export class UpdateCleaningComponentDto {
  @IsOptional()
  @TrimTranslatedText()
  @IsTranslatedText({ partial: true, minLength: 2, maxLength: 100 })
  title?: TranslatedTextPatch;

  @IsOptional()
  @TrimTranslatedText()
  @IsTranslatedText({
    partial: true,
    allowClearingDefault: true,
    maxLength: 1000,
  })
  description?: TranslatedTextPatch;
}
