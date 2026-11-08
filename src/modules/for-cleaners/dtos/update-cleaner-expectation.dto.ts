import { IsInt, IsOptional, Min } from 'class-validator';
import { TrimTranslatedText } from 'src/common/transformers';
import { TranslatedTextPatch } from 'src/common/types';
import { IsTranslatedText } from 'src/common/validators';

export class UpdateCleanerExpectationDto {
  @IsOptional()
  @TrimTranslatedText()
  @IsTranslatedText({ partial: true, minLength: 1, maxLength: 200 })
  title?: TranslatedTextPatch;

  @IsOptional()
  @TrimTranslatedText()
  @IsTranslatedText({ partial: true, maxLength: 1000 })
  description?: TranslatedTextPatch;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
