import 'dotenv/config';
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AdminService } from '../../src/core/admin/admin.service';
import { seedSuperAdmin } from './admin/super-admin.seed';
import { SeederModule } from './seeder.module';

interface Seeder {
  name: string;
  run: (app: INestApplicationContext) => Promise<void>;
}

const SEEDERS: Seeder[] = [
  { name: 'super-admin', run: (app) => seedSuperAdmin(app.get(AdminService)) },
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
