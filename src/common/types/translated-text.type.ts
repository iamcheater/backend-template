import {
  DEFAULT_LANGUAGE,
  SupportedLanguage,
} from 'src/localization/supported-language.enum';

export type TranslatedTextPatch = Partial<Record<SupportedLanguage, string>>;

export type TranslatedText = TranslatedTextPatch &
  Record<typeof DEFAULT_LANGUAGE, string>;
