import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { DEFAULT_LANGUAGE, SupportedLanguage } from './supported-language.enum';

@Injectable()
export class LocalizationService {
  constructor(private readonly i18n: I18nService) {}

  translate(
    key: string,
    lang: SupportedLanguage = DEFAULT_LANGUAGE,
    args?: Record<string, unknown>,
  ): string {
    return this.i18n.translate(key, { lang, args });
  }
}
