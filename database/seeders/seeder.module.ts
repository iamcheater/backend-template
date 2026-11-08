import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from '../../src/modules/admin/admin.module';
import { ForCleanersModule } from '../../src/modules/for-cleaners/for-cleaners.module';
import { HowItWorksModule } from '../../src/modules/how-it-works/how-it-works.module';
import { PrivacyPolicyModule } from '../../src/modules/privacy-policy/privacy-policy.module';
import { SocialLinkModule } from '../../src/modules/social-link/social-link.module';
import { StandardsModule } from '../../src/modules/standards/standards.module';
import { TalkToUsModule } from '../../src/modules/talk-to-us/talk-to-us.module';
import { TermsAndConditionsModule } from '../../src/modules/terms-and-conditions/terms-and-conditions.module';
import { appConfig, awsConfig, mediaConfig } from '../../src/configurations';
import { configValidationSchema } from '../../src/utils/joi';
import { dataSourceOptions } from '../ormconfig';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, awsConfig, mediaConfig],
      validationSchema: configValidationSchema,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    AdminModule,
    SocialLinkModule,
    HowItWorksModule,
    StandardsModule,
    TalkToUsModule,
    PrivacyPolicyModule,
    TermsAndConditionsModule,
    ForCleanersModule,
  ],
})
export class SeederModule {}
