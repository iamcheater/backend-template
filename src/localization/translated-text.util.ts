import { TranslatedTextPatch } from 'src/common/types';
import { getDefaultLanguage } from './language-settings';
import { SupportedLanguage } from './supported-language.enum';

export function localize(
  text: TranslatedTextPatch | null,
  language: SupportedLanguage,
): string | null {
  if (!text) {
    return null;
  }

  return text[language] || text[getDefaultLanguage()] || null;
}

export function mergeTranslatedText<T extends TranslatedTextPatch>(
  current: T | null,
  patch: TranslatedTextPatch,
): T {
  const merged: TranslatedTextPatch = { ...current, ...patch };

  for (const language of Object.values(SupportedLanguage)) {
    if (merged[language] === '') {
      delete merged[language];
    }
  }

  return merged as T;
}
