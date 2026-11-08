import { SupportedLanguage } from './supported-language.enum';
import { localize, mergeTranslatedText } from './translated-text.util';

describe('localize', () => {
  const text = { en: 'Clean', hy: 'Մաքուր' };

  it('returns the requested language when it is translated', () => {
    expect(localize(text, SupportedLanguage.HY)).toBe('Մաքուր');
  });

  it('falls back to English when the requested language is missing or empty', () => {
    expect(localize(text, SupportedLanguage.RU)).toBe('Clean');
    expect(localize({ en: 'Clean', ru: '' }, SupportedLanguage.RU)).toBe(
      'Clean',
    );
  });

  it('returns null when there is no text at all', () => {
    expect(localize(null, SupportedLanguage.EN)).toBeNull();
    expect(localize({}, SupportedLanguage.HY)).toBeNull();
  });

  it('returns another language rather than nothing only via English', () => {
    expect(localize({ hy: 'Մաքուր' }, SupportedLanguage.RU)).toBeNull();
  });
});

describe('mergeTranslatedText', () => {
  it('overwrites only the languages present in the patch', () => {
    expect(
      mergeTranslatedText({ en: 'Clean', hy: 'Մաքուր' }, { ru: 'Чисто' }),
    ).toEqual({ en: 'Clean', hy: 'Մաքուր', ru: 'Чисто' });
  });

  it('removes a language when the patch sets it to an empty string', () => {
    expect(
      mergeTranslatedText({ en: 'Clean', hy: 'Մաքուր' }, { hy: '' }),
    ).toEqual({ en: 'Clean' });
  });

  it('starts from nothing when there is no current value', () => {
    expect(mergeTranslatedText(null, { en: 'Clean' })).toEqual({
      en: 'Clean',
    });
  });

  it('does not mutate the current value', () => {
    const current = { en: 'Clean' };
    mergeTranslatedText(current, { en: 'Fresh' });
    expect(current).toEqual({ en: 'Clean' });
  });
});
