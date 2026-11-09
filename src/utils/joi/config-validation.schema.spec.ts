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
