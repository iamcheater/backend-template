import 'dotenv/config';
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AdminService } from '../../src/modules/admin/admin.service';
import { ForCleanersSectionService } from '../../src/modules/for-cleaners/for-cleaners-section.service';
import { HowItWorksSectionService } from '../../src/modules/how-it-works/how-it-works-section.service';
import { PrivacyPolicyService } from '../../src/modules/privacy-policy/privacy-policy.service';
import { SocialLinkService } from '../../src/modules/social-link/social-link.service';
import { StandardsService } from '../../src/modules/standards/standards.service';
import { TalkToUsService } from '../../src/modules/talk-to-us/talk-to-us.service';
import { TermsAndConditionsService } from '../../src/modules/terms-and-conditions/terms-and-conditions.service';
import { seedForCleanersSection } from './for-cleaners/for-cleaners-section.seed';
import { seedHowItWorksSection } from './how-it-works/how-it-works-section.seed';
import { seedSuperAdmin } from './admin/super-admin.seed';
import { seedPrivacyPolicy } from './privacy-policy/privacy-policy.seed';
import { SeederModule } from './seeder.module';
import { seedSocialLinks } from './social-link/social-links.seed';
import { seedStandards } from './standards/standards.seed';
import { seedTalkToUs } from './talk-to-us/talk-to-us.seed';
import { seedTermsAndConditions } from './terms-and-conditions/terms-and-conditions.seed';

interface Seeder {
  name: string;
  run: (app: INestApplicationContext) => Promise<void>;
}

const SEEDERS: Seeder[] = [
  { name: 'super-admin', run: (app) => seedSuperAdmin(app.get(AdminService)) },
  {
    name: 'social-links',
    run: (app) => seedSocialLinks(app.get(SocialLinkService)),
  },
  {
    name: 'how-it-works',
    run: (app) => seedHowItWorksSection(app.get(HowItWorksSectionService)),
  },
  { name: 'standards', run: (app) => seedStandards(app.get(StandardsService)) },
  { name: 'talk-to-us', run: (app) => seedTalkToUs(app.get(TalkToUsService)) },
  {
    name: 'privacy-policy',
    run: (app) => seedPrivacyPolicy(app.get(PrivacyPolicyService)),
  },
  {
    name: 'terms-and-conditions',
    run: (app) => seedTermsAndConditions(app.get(TermsAndConditionsService)),
  },
  {
    name: 'for-cleaners',
    run: (app) => seedForCleanersSection(app.get(ForCleanersSectionService)),
  },
];

const selectSeeders = (requested: string[]): Seeder[] => {
  const unknown = requested.filter(
    (name) => !SEEDERS.some((seeder) => seeder.name === name),
  );

  if (unknown.length > 0) {
    throw new Error(
      `Unknown seeder(s): ${unknown.join(', ')}. Available: ${SEEDERS.map((seeder) => seeder.name).join(', ')}`,
    );
  }

  return requested.length > 0
    ? SEEDERS.filter((seeder) => requested.includes(seeder.name))
    : SEEDERS;
};

async function bootstrap() {
  const seeders = selectSeeders(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(SeederModule);
  const failed: string[] = [];

  for (const seeder of seeders) {
    try {
      await seeder.run(app);
      console.log(`✓ ${seeder.name}`);
    } catch (error) {
      failed.push(seeder.name);
      console.error(
        `✗ ${seeder.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  await app.close();

  console.log(
    `Seeding finished: ${seeders.length - failed.length} succeeded, ${failed.length} failed${failed.length > 0 ? ` (${failed.join(', ')})` : ''}`,
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
