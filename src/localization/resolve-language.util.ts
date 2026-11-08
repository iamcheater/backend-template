import { Request } from 'express';
import { DEFAULT_LANGUAGE, SupportedLanguage } from './supported-language.enum';

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return (Object.values(SupportedLanguage) as string[]).includes(value);
}

export function resolveLanguage(request: Request): SupportedLanguage {
  const headerLanguage =
    (request.headers['language'] as string) ||
    (request.headers['x-language'] as string);

  if (headerLanguage && isSupportedLanguage(headerLanguage)) {
    return headerLanguage;
  }

  const acceptLanguage = request.headers['accept-language'];

  if (acceptLanguage) {
    const primary = acceptLanguage.split(',')[0].split('-')[0].trim();

    if (isSupportedLanguage(primary)) {
      return primary;
    }
  }

  return DEFAULT_LANGUAGE;
}
