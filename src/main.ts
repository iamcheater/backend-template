import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { AppModule } from './app.module';

const REQUEST_BODY_LIMIT = '2mb';

async function bootstrap() {
  initializeTransactionalContext();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  const nodeEnv = configService.get<string>('app.nodeEnv');
  const corsOrigins = configService.get<string[]>('app.corsOrigins') ?? [];

  if (nodeEnv !== 'local' && corsOrigins.length === 0) {
    throw new Error(
      `CORS_ORIGINS must be set to a comma-separated list of allowed origins when NODE_ENV=${nodeEnv}`,
    );
  }

  app.set('trust proxy', configService.get<number>('app.trustProxy') ?? 0);
  app.useBodyParser('json', { limit: REQUEST_BODY_LIMIT });
  app.useBodyParser('urlencoded', {
    limit: REQUEST_BODY_LIMIT,
    extended: true,
  });
  app.use(helmet());
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
  });

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Backend API')
      .setDescription('Backend API reference')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument);
  }

  await app.listen(configService.get<number>('app.port') ?? 3060);
}

void bootstrap();
