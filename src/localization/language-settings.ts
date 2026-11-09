import { SupportedLanguage } from './supported-language.enum';

export interface LanguageSettings {
  supported: SupportedLanguage[];
  defaultLanguage: SupportedLanguage;
}

const SHIPPED_LANGUAGES = Object.values(SupportedLanguage);

let current: LanguageSettings = {
  supported: SHIPPED_LANGUAGES,
  defaultLanguage: SupportedLanguage.EN,
};

export function isShippedLanguage(value: string): value is SupportedLanguage {
  return (SHIPPED_LANGUAGES as string[]).includes(value);
}

export function configureLanguages(
  supported: string[],
  defaultLanguage: string,
): void {
  const shipped = supported.filter(isShippedLanguage);

  if (
    !isShippedLanguage(defaultLanguage) ||
    !shipped.includes(defaultLanguage)
  ) {
    throw new Error(
      `DEFAULT_LANGUAGE "${defaultLanguage}" must be one of SUPPORTED_LANGUAGES (${supported.join(', ')})`,
    );
  }

  current = { supported: shipped, defaultLanguage };
}

export function getSupportedLanguages(): SupportedLanguage[] {
  return current.supported;
}

export function getDefaultLanguage(): SupportedLanguage {
  return current.defaultLanguage;
}

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return (current.supported as string[]).includes(value);
}
