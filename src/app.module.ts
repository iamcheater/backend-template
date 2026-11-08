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
  appConfig,
  awsConfig,
  mediaConfig,
  telegramConfig,
} from './configurations';
import { LocalizationModule } from './localization/localization.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CleanerModule } from './modules/cleaner/cleaner.module';
import { CleaningComponentModule } from './modules/cleaning-component/cleaning-component.module';
import { ContactEmailModule } from './modules/contact-email/contact-email.module';
import { ContactPhoneModule } from './modules/contact-phone/contact-phone.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { ForCleanersModule } from './modules/for-cleaners/for-cleaners.module';
import { HeroSectionModule } from './modules/hero-section/hero-section.module';
import { HowItWorksModule } from './modules/how-it-works/how-it-works.module';
import { MediaModule } from './modules/media/media.module';
import { PrivacyPolicyModule } from './modules/privacy-policy/privacy-policy.module';
import { QuoteModule } from './modules/quote/quote.module';
import { ServiceModule } from './modules/service/service.module';
import { SocialLinkModule } from './modules/social-link/social-link.module';
import { StandardsModule } from './modules/standards/standards.module';
import { TalkToUsModule } from './modules/talk-to-us/talk-to-us.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { TermsAndConditionsModule } from './modules/terms-and-conditions/terms-and-conditions.module';
import { UsersModule } from './modules/users/users.module';
import { configValidationSchema } from './utils/joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, awsConfig, telegramConfig, mediaConfig],
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
    UsersModule,
    AuthModule,
    HealthModule,
    AdminModule,
    QuoteModule,
    CleanerModule,
    TelegramModule,
    CleaningComponentModule,
    ServiceModule,
    MediaModule,
    HeroSectionModule,
    SocialLinkModule,
    ContactPhoneModule,
    ContactEmailModule,
    HowItWorksModule,
    StandardsModule,
    TalkToUsModule,
    PrivacyPolicyModule,
    TermsAndConditionsModule,
    ForCleanersModule,
    DashboardModule,
  ],
})
export class AppModule {}
