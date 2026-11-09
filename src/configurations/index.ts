export const appConfig = () => ({
  app: {
    port: parseInt(process.env.PORT ?? '3060', 10),
    nodeEnv: process.env.NODE_ENV ?? 'local',
    trustProxy: parseInt(process.env.TRUST_PROXY ?? '0', 10),
    internalApiKey: process.env.INTERNAL_API_KEY,
    adminDashboardUrl: process.env.ADMIN_DASHBOARD_URL,
    corsOrigins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
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
