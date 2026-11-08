import 'dotenv/config';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AdminEntity } from '../src/modules/admin/entities';
import { CleanerEntity } from '../src/modules/cleaner/entities';
import { CleaningComponentEntity } from '../src/modules/cleaning-component/entities';
import { ContactEmailEntity } from '../src/modules/contact-email/entities';
import { ContactPhoneEntity } from '../src/modules/contact-phone/entities';
import {
  CleanerExpectationEntity,
  ForCleanersSectionEntity,
} from '../src/modules/for-cleaners/entities';
import { HeroSlideEntity } from '../src/modules/hero-section/entities';
import {
  HowItWorksSectionEntity,
  HowItWorksStepEntity,
} from '../src/modules/how-it-works/entities';
import { MediaAssetEntity } from '../src/modules/media/entities';
import { PrivacyPolicyEntity } from '../src/modules/privacy-policy/entities';
import { QuoteEntity } from '../src/modules/quote/entities';
import { ServiceEntity } from '../src/modules/service/entities';
import { SocialLinkEntity } from '../src/modules/social-link/entities';
import { StandardsSectionEntity } from '../src/modules/standards/entities';
import { TalkToUsSectionEntity } from '../src/modules/talk-to-us/entities';
import { TermsAndConditionsEntity } from '../src/modules/terms-and-conditions/entities';
import { UserEntity } from '../src/modules/users/entities';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
  entities: [
    UserEntity,
    AdminEntity,
    QuoteEntity,
    CleanerEntity,
    ServiceEntity,
    CleaningComponentEntity,
    MediaAssetEntity,
    HeroSlideEntity,
    SocialLinkEntity,
    ContactPhoneEntity,
    ContactEmailEntity,
    ForCleanersSectionEntity,
    CleanerExpectationEntity,
    HowItWorksSectionEntity,
    HowItWorksStepEntity,
    StandardsSectionEntity,
    TalkToUsSectionEntity,
    PrivacyPolicyEntity,
    TermsAndConditionsEntity,
  ],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: ['local', 'test'].includes(process.env.NODE_ENV ?? ''),
  logging: false,
};

export const AppDataSource = new DataSource(dataSourceOptions);
