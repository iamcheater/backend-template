import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { getDefaultLanguage } from './language-settings';
import { SupportedLanguage } from './supported-language.enum';

@Injectable()
export class LocalizationService {
  constructor(private readonly i18n: I18nService) {}

  translate(
    key: string,
    lang: SupportedLanguage = getDefaultLanguage(),
    args?: Record<string, unknown>,
  ): string {
    return this.i18n.translate(key, { lang, args });
  }
}
