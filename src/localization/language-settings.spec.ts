import {
  configureLanguages,
  getDefaultLanguage,
  getSupportedLanguages,
  isSupportedLanguage,
} from './language-settings';
import { SupportedLanguage } from './supported-language.enum';

describe('language settings', () => {
  afterEach(() => {
    configureLanguages(['hy', 'en', 'ru'], 'en');
  });

  it('defaults to every shipped language with English as the default', () => {
    expect(getSupportedLanguages()).toEqual(
      expect.arrayContaining(Object.values(SupportedLanguage)),
    );
    expect(getDefaultLanguage()).toBe(SupportedLanguage.EN);
  });

  it('applies the configured languages and default', () => {
    configureLanguages(['hy'], 'hy');

    expect(getSupportedLanguages()).toEqual([SupportedLanguage.HY]);
    expect(getDefaultLanguage()).toBe(SupportedLanguage.HY);
    expect(isSupportedLanguage('hy')).toBe(true);
    expect(isSupportedLanguage('en')).toBe(false);
  });

  it('rejects a default language that is not in the supported list', () => {
    expect(() => configureLanguages(['hy', 'ru'], 'en')).toThrow(
      /DEFAULT_LANGUAGE "en" must be one of SUPPORTED_LANGUAGES/,
    );
  });

  it('ignores languages the template does not ship', () => {
    configureLanguages(['hy', 'de'], 'hy');

    expect(getSupportedLanguages()).toEqual([SupportedLanguage.HY]);
  });
});
