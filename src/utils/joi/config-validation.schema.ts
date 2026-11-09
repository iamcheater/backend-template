import * as Joi from 'joi';
import {
  DEFAULT_SUPPORTED_LANGUAGES,
  FALLBACK_DEFAULT_LANGUAGE,
} from 'src/configurations';
import { SupportedLanguage } from 'src/localization/supported-language.enum';

const SHIPPED_LANGUAGES: string[] = Object.values(SupportedLanguage);

const languageListOf = (value: string): string[] =>
  value
    .split(',')
    .map((language) => language.trim())
    .filter(Boolean);

const validateLanguageList: Joi.CustomValidator<string> = (value, helpers) => {
  const languages = languageListOf(value);
  const unknown = languages.filter(
    (language) => !SHIPPED_LANGUAGES.includes(language),
  );

  if (languages.length === 0 || unknown.length > 0) {
    return helpers.message({
      custom: `SUPPORTED_LANGUAGES must be a comma-separated list of ${SHIPPED_LANGUAGES.join(', ')}`,
    });
  }

  return value;
};

const validateDefaultLanguageIsSupported: Joi.CustomValidator<{
  SUPPORTED_LANGUAGES: string;
  DEFAULT_LANGUAGE: string;
}> = (env, helpers) => {
  const supported = languageListOf(env.SUPPORTED_LANGUAGES);

  if (!supported.includes(env.DEFAULT_LANGUAGE)) {
    return helpers.message({
      custom: 'DEFAULT_LANGUAGE must be one of SUPPORTED_LANGUAGES',
    });
  }

  return env;
};

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('local', 'develop', 'production', 'test')
    .default('local'),
  PORT: Joi.number().default(3060),
  TRUST_PROXY: Joi.number().integer().min(0).default(0),
  INTERNAL_API_KEY: Joi.string().min(32).allow('').optional(),

  CORS_ORIGINS: Joi.string().allow('').optional(),

  POSTGRES_HOST: Joi.string().required(),
  POSTGRES_PORT: Joi.number().required(),
  POSTGRES_USERNAME: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().allow('').required(),
  POSTGRES_DATABASE: Joi.string().required(),

  ADMIN_JWT_SECRET: Joi.string().required(),
  ADMIN_JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .allow('')
    .optional(),

  AWS_REGION: Joi.string().allow('').optional(),
  AWS_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  AWS_S3_BUCKET: Joi.string().allow('').optional(),

  SUPPORTED_LANGUAGES: Joi.string()
    .custom(validateLanguageList)
    .default(DEFAULT_SUPPORTED_LANGUAGES),
  DEFAULT_LANGUAGE: Joi.string()
    .valid(...SHIPPED_LANGUAGES)
    .default(FALLBACK_DEFAULT_LANGUAGE),

  ADMIN_DASHBOARD_URL: Joi.string().allow('').optional(),

  WEBSITE_URL: Joi.string().uri().allow('').optional(),
  WEBSITE_REVALIDATE_SECRET: Joi.string().min(32).allow('').optional(),

  TELEGRAM_BOT_TOKEN: Joi.string().allow('').optional(),
  TELEGRAM_CHAT_ID: Joi.string().allow('').optional(),

  MEDIA_PUBLIC_BASE_URL: Joi.string().uri().allow('').optional(),
  MEDIA_MAX_IMAGE_SIZE_MB: Joi.number().optional(),
  MEDIA_MAX_VIDEO_CHUNK_SIZE_MB: Joi.number().optional(),
}).custom(validateDefaultLanguageIsSupported);
