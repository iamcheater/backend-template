import { SupportedLanguage } from 'src/localization/supported-language.enum';

export type TranslatedTextPatch = Partial<Record<SupportedLanguage, string>>;

export type TranslatedText = TranslatedTextPatch;
