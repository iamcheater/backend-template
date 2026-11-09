import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { TranslatedTextPatch } from 'src/common/types';
import { IsTranslatedText } from 'src/common/validators';
import { LocalizationService } from 'src/localization/localization.service';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { localize } from 'src/localization/translated-text.util';
import { overrideEnv } from './helpers';

class TranslatedTitleDto {
  @IsTranslatedText()
  title: TranslatedTextPatch;
}

describe('Languages from SUPPORTED_LANGUAGES and DEFAULT_LANGUAGE (e2e)', () => {
  let app: INestApplication;
  let restoreEnv: () => void;

  const messages = {
    hy: 'Դուք իրավասու չեք կատարելու այս գործողությունը։',
    en: 'You are not authorized to perform this action.',
  };

  const unauthorizedMessage = async (
    headers: Record<string, string>,
  ): Promise<string> => {
    const response = await request(app.getHttpServer())
      .get('/admin/me')
      .set(headers)
      .expect(401);

    return (response.body as { message: string }).message;
  };

  const isValidTitle = (title: unknown): boolean =>
    validateSync(plainToInstance(TranslatedTitleDto, { title })).length === 0;

  beforeAll(async () => {
    restoreEnv = overrideEnv({
      SUPPORTED_LANGUAGES: 'hy,en',
      DEFAULT_LANGUAGE: 'hy',
    });

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    restoreEnv();
  });

  it('ships the expected Armenian message for this check', async () => {
    expect(await unauthorizedMessage({ 'x-language': 'hy' })).toBe(messages.hy);
  });

  describe('request language resolution', () => {
    it('answers in DEFAULT_LANGUAGE when the request names no language', async () => {
      expect(await unauthorizedMessage({})).toBe(messages.hy);
    });

    it('honours a supported language from the language header', async () => {
      expect(await unauthorizedMessage({ language: 'en' })).toBe(messages.en);
    });

    it('honours a supported language from the x-language header', async () => {
      expect(await unauthorizedMessage({ 'x-language': 'en' })).toBe(
        messages.en,
      );
    });

    it('uses Accept-Language when no language header is sent', async () => {
      expect(
        await unauthorizedMessage({ 'accept-language': 'en-US,en;q=0.9' }),
      ).toBe(messages.en);
    });

    it('prefers the language header over Accept-Language', async () => {
      expect(
        await unauthorizedMessage({
          'x-language': 'hy',
          'accept-language': 'en-US',
        }),
      ).toBe(messages.hy);
    });

    it('falls back to the default for a language the template ships but this client does not use', async () => {
      expect(await unauthorizedMessage({ 'x-language': 'ru' })).toBe(
        messages.hy,
      );
    });

    it('falls back to the default for an unknown language', async () => {
      expect(await unauthorizedMessage({ 'x-language': 'de' })).toBe(
        messages.hy,
      );
    });
  });

  describe('translated content', () => {
    it('requires the configured default language, not English', () => {
      expect(isValidTitle({ hy: 'Բարև' })).toBe(true);
      expect(isValidTitle({ en: 'Hello' })).toBe(false);
    });

    it('rejects text for a language this client does not use', () => {
      expect(isValidTitle({ hy: 'Բարև', ru: 'Привет' })).toBe(false);
    });

    it('falls back to the configured default language when localizing', () => {
      expect(localize({ hy: 'Բարև', en: 'Hello' }, SupportedLanguage.RU)).toBe(
        'Բարև',
      );
    });

    it('translates into the configured default language by default', () => {
      expect(app.get(LocalizationService).translate('error.UNAUTHORIZED')).toBe(
        messages.hy,
      );
    });
  });
});
