import { Request } from 'express';
import { resolveLanguage } from './resolve-language.util';
import { SupportedLanguage } from './supported-language.enum';

function requestWith(headers: Record<string, string>): Request {
  return { headers } as unknown as Request;
}

describe('resolveLanguage', () => {
  it('uses the language header first', () => {
    expect(
      resolveLanguage(
        requestWith({ language: 'hy', 'accept-language': 'ru-RU,ru;q=0.9' }),
      ),
    ).toBe(SupportedLanguage.HY);
  });

  it('accepts the x-language header', () => {
    expect(resolveLanguage(requestWith({ 'x-language': 'ru' }))).toBe(
      SupportedLanguage.RU,
    );
  });

  it('falls back to the primary Accept-Language tag', () => {
    expect(
      resolveLanguage(requestWith({ 'accept-language': 'ru-RU,en;q=0.8' })),
    ).toBe(SupportedLanguage.RU);
  });

  it('ignores unsupported languages and defaults to English', () => {
    expect(
      resolveLanguage(requestWith({ language: 'de', 'accept-language': 'fr' })),
    ).toBe(SupportedLanguage.EN);
    expect(resolveLanguage(requestWith({}))).toBe(SupportedLanguage.EN);
  });
});
