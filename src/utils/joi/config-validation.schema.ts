import * as Joi from 'joi';

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

  ADMIN_DASHBOARD_URL: Joi.string().allow('').optional(),

  TELEGRAM_BOT_TOKEN: Joi.string().allow('').optional(),
  TELEGRAM_CHAT_ID: Joi.string().allow('').optional(),

  MEDIA_PUBLIC_BASE_URL: Joi.string().uri().allow('').optional(),
  MEDIA_MAX_IMAGE_SIZE_MB: Joi.number().optional(),
  MEDIA_MAX_VIDEO_CHUNK_SIZE_MB: Joi.number().optional(),
});
