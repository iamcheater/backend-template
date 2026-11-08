import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { TrimTranslatedText } from 'src/common/transformers';
import { TranslatedTextPatch } from 'src/common/types';
import { IsTranslatedText } from 'src/common/validators';
import { UploadPurpose } from 'src/modules/media/enums';
import { HOW_IT_WORKS_UPLOAD_PURPOSES } from '../utils';

export class UpdateHowItWorksStepDto {
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

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsIn(HOW_IT_WORKS_UPLOAD_PURPOSES)
  purpose?: UploadPurpose;
}
