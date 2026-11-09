import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'dotenv';
import { configValidationSchema } from './config-validation.schema';

const requiredEnv = {
  POSTGRES_HOST: 'localhost',
  POSTGRES_PORT: '5432',
  POSTGRES_USERNAME: 'postgres',
  POSTGRES_PASSWORD: 'postgres',
  POSTGRES_DATABASE: 'backend',
  ADMIN_JWT_SECRET: 'secret',
};

describe('configValidationSchema', () => {
  it('accepts the committed .env.example as-is', () => {
    const example = parse(
      readFileSync(join(__dirname, '..', '..', '..', '.env.example')),
    );

    const { error } = configValidationSchema.validate(example, {
      allowUnknown: true,
    });

    expect(error).toBeUndefined();
  });

  it.each([
    'INTERNAL_API_KEY',
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET',
    'ADMIN_DASHBOARD_URL',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
  ])('accepts an empty %s', (key) => {
    const { error } = configValidationSchema.validate({
      ...requiredEnv,
      [key]: '',
    });

    expect(error).toBeUndefined();
  });

  it('rejects a non-empty INTERNAL_API_KEY shorter than 32 characters', () => {
    const { error } = configValidationSchema.validate({
      ...requiredEnv,
      INTERNAL_API_KEY: 'too-short',
    });

    expect(error?.details[0].context?.key).toBe('INTERNAL_API_KEY');
  });

  it('rejects an empty required value', () => {
    const { error } = configValidationSchema.validate({
      ...requiredEnv,
      POSTGRES_HOST: '',
    });

    expect(error?.details[0].context?.key).toBe('POSTGRES_HOST');
  });
});

describe('configValidationSchema languages and website', () => {
  const baseEnv = {
    POSTGRES_HOST: 'localhost',
    POSTGRES_PORT: '5432',
    POSTGRES_USERNAME: 'postgres',
    POSTGRES_PASSWORD: 'postgres',
    POSTGRES_DATABASE: 'backend',
    ADMIN_JWT_SECRET: 'secret',
  };

  it('defaults to all shipped languages with English as the default', () => {
    const { error, value } = configValidationSchema.validate(baseEnv);

    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      SUPPORTED_LANGUAGES: 'hy,en,ru',
      DEFAULT_LANGUAGE: 'en',
    });
  });

  it('accepts a single-language client', () => {
    const { error } = configValidationSchema.validate({
      ...baseEnv,
      SUPPORTED_LANGUAGES: 'hy',
      DEFAULT_LANGUAGE: 'hy',
    });

    expect(error).toBeUndefined();
  });

  it('rejects a language the template does not ship', () => {
    const { error } = configValidationSchema.validate({
      ...baseEnv,
      SUPPORTED_LANGUAGES: 'hy,de',
      DEFAULT_LANGUAGE: 'hy',
    });

    expect(error?.message).toMatch(/SUPPORTED_LANGUAGES must be/);
  });

  it('rejects a default language missing from SUPPORTED_LANGUAGES', () => {
    const { error } = configValidationSchema.validate({
      ...baseEnv,
      SUPPORTED_LANGUAGES: 'hy,ru',
      DEFAULT_LANGUAGE: 'en',
    });

    expect(error?.message).toBe(
      'DEFAULT_LANGUAGE must be one of SUPPORTED_LANGUAGES',
    );
  });

  it('rejects an ADMIN_JWT_EXPIRES_IN that is not a duration like 14d', () => {
    const { error } = configValidationSchema.validate({
      ...baseEnv,
      ADMIN_JWT_EXPIRES_IN: 'two weeks',
    });

    expect(error?.details[0].context?.key).toBe('ADMIN_JWT_EXPIRES_IN');
  });

  it('rejects a non-empty WEBSITE_REVALIDATE_SECRET shorter than 32 characters', () => {
    const { error } = configValidationSchema.validate({
      ...baseEnv,
      WEBSITE_REVALIDATE_SECRET: 'too-short',
    });

    expect(error?.details[0].context?.key).toBe('WEBSITE_REVALIDATE_SECRET');
  });

  it('accepts empty website settings', () => {
    const { error } = configValidationSchema.validate({
      ...baseEnv,
      WEBSITE_URL: '',
      WEBSITE_REVALIDATE_SECRET: '',
    });

    expect(error).toBeUndefined();
  });
});
