import { IsOptional } from 'class-validator';
import { TrimTranslatedText } from 'src/common/transformers';
import { TranslatedText, TranslatedTextPatch } from 'src/common/types';
import { IsTranslatedText } from 'src/common/validators';

export class CreateCleaningComponentDto {
  @TrimTranslatedText()
  @IsTranslatedText({ minLength: 2, maxLength: 100 })
  title: TranslatedText;

  @IsOptional()
  @TrimTranslatedText()
  @IsTranslatedText({
    partial: true,
    allowClearingDefault: true,
    maxLength: 1000,
  })
  description?: TranslatedTextPatch;
}
