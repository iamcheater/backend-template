import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
} from 'nestjs-i18n';
import { DataSource, DataSourceOptions } from 'typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { dataSourceOptions } from '../database/ormconfig';
import { CommonModule } from './common/common.module';
import { ServeStaticDefinition } from './common/static';
import {
  adminAuthConfig,
  appConfig,
  awsConfig,
  ENV_FILE_PATH,
  languageConfig,
  mediaConfig,
  shouldLoadEnvFile,
  telegramConfig,
  websiteConfig,
} from './configurations';
import { AdminAuthModule } from './core/admin-auth/admin-auth.module';
import { AdminModule } from './core/admin/admin.module';
import { HealthModule } from './core/health/health.module';
import { MediaModule } from './core/media/media.module';
import { NotificationsModule } from './core/notifications';
import { RevalidationModule } from './core/revalidation/revalidation.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { LocalizationModule } from './localization/localization.module';
import { configValidationSchema } from './utils/joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ENV_FILE_PATH,
      ignoreEnvFile: !shouldLoadEnvFile(),
      load: [
        appConfig,
        adminAuthConfig,
        awsConfig,
        telegramConfig,
        mediaConfig,
        languageConfig,
        websiteConfig,
      ],
      validationSchema: configValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({ ...dataSourceOptions, autoLoadEntities: true }),
      dataSourceFactory: (options?: DataSourceOptions) => {
        if (!options) {
          throw new Error('Invalid TypeORM data source options');
        }

        return Promise.resolve(
          addTransactionalDataSource(new DataSource(options)),
        );
      },
    }),
    I18nModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        fallbackLanguage: configService.get<string>('language.default'),
        loaderOptions: {
          path: join(__dirname, 'i18n/'),
          watch: configService.get<string>('app.nodeEnv') === 'local',
        },
      }),
      resolvers: [
        { use: HeaderResolver, options: ['x-language', 'language'] },
        AcceptLanguageResolver,
      ],
    }),
    EventEmitterModule.forRoot(),
    ServeStaticDefinition,
    CommonModule,
    LocalizationModule,
    HealthModule,
    AdminModule,
    AdminAuthModule,
    MediaModule,
    NotificationsModule,
    RevalidationModule,
    IntegrationsModule,
  ],
})
export class AppModule {}
