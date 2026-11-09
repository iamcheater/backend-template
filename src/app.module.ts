import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
  mediaConfig,
  telegramConfig,
} from './configurations';
import { AdminAuthModule } from './core/admin-auth/admin-auth.module';
import { AdminModule } from './core/admin/admin.module';
import { HealthModule } from './core/health/health.module';
import { MediaModule } from './core/media/media.module';
import { TelegramModule } from './core/notifications/channels/telegram/telegram.module';
import { LocalizationModule } from './localization/localization.module';
import { configValidationSchema } from './utils/joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        adminAuthConfig,
        awsConfig,
        telegramConfig,
        mediaConfig,
      ],
      validationSchema: configValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => dataSourceOptions,
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
        fallbackLanguage: 'en',
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
    ServeStaticDefinition,
    CommonModule,
    LocalizationModule,
    HealthModule,
    AdminModule,
    AdminAuthModule,
    MediaModule,
    TelegramModule,
  ],
})
export class AppModule {}
