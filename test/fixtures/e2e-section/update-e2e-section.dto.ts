import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';
import { TranslatedTextPatch } from 'src/common/types';
import { TrimTranslatedText } from 'src/common/transformers';
import { IsTranslatedText } from 'src/common/validators';

export class UpdateE2eSectionDto {
  @ValidateIf((_dto, value) => value !== undefined)
  @TrimTranslatedText()
  @IsTranslatedText({ partial: true, maxLength: 100 })
  title?: TranslatedTextPatch;

  @IsOptional()
  @TrimTranslatedText()
  @IsTranslatedText({ partial: true, allowClearingDefault: true })
  subtitle?: TranslatedTextPatch | null;

  @IsOptional()
  @IsString()
  ctaUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
