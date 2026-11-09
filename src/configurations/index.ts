import { config } from 'dotenv';

export const ENV_FILE_PATH = '.env.local';

export const shouldLoadEnvFile = (): boolean => process.env.NODE_ENV !== 'test';

export const loadEnvFile = (): void => {
  if (shouldLoadEnvFile()) {
    config({ path: ENV_FILE_PATH, quiet: true });
  }
};

const parseList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const DEFAULT_SUPPORTED_LANGUAGES = 'hy,en,ru';
export const FALLBACK_DEFAULT_LANGUAGE = 'en';

export const appConfig = () => ({
  app: {
    port: parseInt(process.env.PORT ?? '3060', 10),
    nodeEnv: process.env.NODE_ENV ?? 'local',
    trustProxy: parseInt(process.env.TRUST_PROXY ?? '0', 10),
    internalApiKey: process.env.INTERNAL_API_KEY,
    adminDashboardUrl: process.env.ADMIN_DASHBOARD_URL,
    corsOrigins: parseList(process.env.CORS_ORIGINS ?? ''),
  },
});

export const adminAuthConfig = () => ({
  adminAuth: {
    jwtSecret: process.env.ADMIN_JWT_SECRET,
    jwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '14d',
  },
});

export const awsConfig = () => ({
  aws: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucket: process.env.AWS_S3_BUCKET,
  },
});

export const telegramConfig = () => ({
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
});

export const mediaConfig = () => ({
  media: {
    publicBaseUrl: process.env.MEDIA_PUBLIC_BASE_URL,
    maxImageSizeMb: parseInt(process.env.MEDIA_MAX_IMAGE_SIZE_MB ?? '10', 10),
    maxVideoChunkSizeMb: parseInt(
      process.env.MEDIA_MAX_VIDEO_CHUNK_SIZE_MB ?? '10',
      10,
    ),
  },
});

export const languageConfig = () => ({
  language: {
    supported: parseList(
      process.env.SUPPORTED_LANGUAGES || DEFAULT_SUPPORTED_LANGUAGES,
    ),
    default: process.env.DEFAULT_LANGUAGE || FALLBACK_DEFAULT_LANGUAGE,
  },
});

export const websiteConfig = () => ({
  website: {
    url: process.env.WEBSITE_URL,
    revalidateSecret: process.env.WEBSITE_REVALIDATE_SECRET,
  },
});
