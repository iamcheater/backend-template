import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from 'src/app.module';

const SRC_ROOT = join(__dirname, '..', 'src');

const listSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(path);
    }

    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')
      ? [path]
      : [];
  });

describe('Database (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('entity registration by glob', () => {
    const sourceFiles = listSourceFiles(SRC_ROOT);
    const entityFiles = sourceFiles.filter(
      (file) =>
        file.endsWith('.entity.ts') &&
        /@Entity\(/.test(readFileSync(file, 'utf8')),
    );

    it('finds table entity files in src', () => {
      expect(entityFiles.length).toBeGreaterThan(0);
    });

    it.each(entityFiles.map((file) => relative(SRC_ROOT, file)))(
      'registers every @Entity class declared in %s with the DataSource',
      (file) => {
        const path = join(SRC_ROOT, file);
        const classNames = [
          ...readFileSync(path, 'utf8').matchAll(
            /@Entity\([^)]*\)\s*export class (\w+)/g,
          ),
        ].map(([, name]) => name);
        const exported = jest.requireActual<Record<string, unknown>>(path);

        expect(classNames.length).toBeGreaterThan(0);

        for (const name of classNames) {
          expect(dataSource.hasMetadata(exported[name] as () => unknown)).toBe(
            true,
          );
        }
      },
    );

    it('keeps every @Entity class in a file named *.entity.ts, the only files the glob loads', () => {
      const misnamed = sourceFiles
        .filter((file) => !file.endsWith('.entity.ts'))
        .filter((file) => /@Entity\(/.test(readFileSync(file, 'utf8')))
        .map((file) => relative(SRC_ROOT, file));

      expect(misnamed).toEqual([]);
    });

    it('registers the core tables', () => {
      const tables = dataSource.entityMetadatas.map(
        (metadata) => metadata.tableName,
      );

      expect(tables).toEqual(
        expect.arrayContaining(['admins', 'media_assets']),
      );
    });
  });

  describe('schema comes only from migrations', () => {
    it('runs with synchronize turned off', () => {
      expect(dataSource.options.synchronize).toBe(false);
    });

    it('loads migrations as both .ts and .js, so the compiled build finds them too', () => {
      expect(dataSource.options.migrations).toEqual([
        expect.stringMatching(/migrations[\\/]\*\.\{ts,js\}$/),
      ]);
    });

    it('has every migration applied to the test database', async () => {
      await expect(dataSource.showMigrations()).resolves.toBe(false);

      const applied = await dataSource.query<{ name: string }[]>(
        'SELECT name FROM migrations ORDER BY id',
      );
      expect(applied.map((row) => row.name)).toEqual(
        expect.arrayContaining([expect.stringMatching(/^InitialSchema\d+$/)]),
      );
    });

    it('has a migrated schema that matches the entities, like migration:check', async () => {
      const pending = await dataSource.driver.createSchemaBuilder().log();

      expect(pending.upQueries.map((query) => query.query)).toEqual([]);
    });
  });
});
