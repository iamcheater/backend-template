import { IsInt, IsOptional, Min } from 'class-validator';
import { TrimTranslatedText } from 'src/common/transformers';
import { TranslatedText } from 'src/common/types';
import { IsTranslatedText } from 'src/common/validators';

export class CreateCleanerExpectationDto {
  @TrimTranslatedText()
  @IsTranslatedText({ minLength: 1, maxLength: 200 })
  title: TranslatedText;

  @TrimTranslatedText()
  @IsTranslatedText({ maxLength: 1000 })
  description: TranslatedText;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
