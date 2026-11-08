import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TrimTranslatedText } from 'src/common/transformers';
import { TranslatedText } from 'src/common/types';
import { IsTranslatedText } from 'src/common/validators';
import { UploadPurpose } from 'src/modules/media/enums';
import { SERVICE_UPLOAD_PURPOSES } from '../utils';

export class CreateServiceDto {
  @TrimTranslatedText()
  @IsTranslatedText({ minLength: 2, maxLength: 100 })
  title: TranslatedText;

  @TrimTranslatedText()
  @IsTranslatedText({ maxLength: 1000 })
  description: TranslatedText;

  @IsString()
  key: string;

  @IsIn(SERVICE_UPLOAD_PURPOSES)
  purpose: UploadPurpose;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  componentIds?: number[];
}
