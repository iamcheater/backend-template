import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TrimTranslatedText } from 'src/common/transformers';
import { TranslatedTextPatch } from 'src/common/types';
import { IsTranslatedText } from 'src/common/validators';
import { UploadPurpose } from 'src/modules/media/enums';
import { SERVICE_UPLOAD_PURPOSES } from '../utils';

export class UpdateServiceDto {
  @IsOptional()
  @TrimTranslatedText()
  @IsTranslatedText({ partial: true, minLength: 2, maxLength: 100 })
  title?: TranslatedTextPatch;

  @IsOptional()
  @TrimTranslatedText()
  @IsTranslatedText({ partial: true, maxLength: 1000 })
  description?: TranslatedTextPatch;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsIn(SERVICE_UPLOAD_PURPOSES)
  purpose?: UploadPurpose;

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
