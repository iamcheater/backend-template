import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { TrimTranslatedText } from 'src/common/transformers';
import { TranslatedText } from 'src/common/types';
import { IsTranslatedText } from 'src/common/validators';
import { UploadPurpose } from 'src/modules/media/enums';
import { HOW_IT_WORKS_UPLOAD_PURPOSES } from '../utils';

export class CreateHowItWorksStepDto {
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

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsIn(HOW_IT_WORKS_UPLOAD_PURPOSES)
  purpose?: UploadPurpose;
}
