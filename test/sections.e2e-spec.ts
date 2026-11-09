import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from 'src/app.module';
import {
  adminRepositoryOf,
  createAdmin,
  loginAdmin,
  overrideEnv,
  waitFor,
} from './helpers';
import {
  E2E_SECTION_TABLE_SQL,
  E2E_SECTION_TAG,
  E2eSectionEntity,
  E2eSectionModule,
  E2eSectionService,
} from './fixtures/e2e-section';

describe('Section base (e2e)', () => {
  let app: INestApplication;
  let repository: Repository<E2eSectionEntity>;
  let sectionService: E2eSectionService;
  let token: string;
  let restoreEnv: () => void;
  let fetchMock: jest.SpyInstance;

  const adminEmail = 'e2e-section-admin@example.com';
  const secret = 'e2e-revalidate-secret-of-32-chars!';

  const server = (): App => app.getHttpServer() as App;
  const patch = (body: object) =>
    request(server())
      .patch('/e2e-section')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  const storedSection = async () =>
    (await repository.find({ order: { id: 'ASC' }, take: 1 }))[0];

  beforeAll(async () => {
    restoreEnv = overrideEnv({
      WEBSITE_URL: 'https://website.example.com',
      WEBSITE_REVALIDATE_SECRET: secret,
    });

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule, E2eSectionModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    await app.get(DataSource).query(E2E_SECTION_TABLE_SQL);
    repository = app.get(getRepositoryToken(E2eSectionEntity));
    sectionService = app.get(E2eSectionService);
    await repository.clear();

    await createAdmin(app, adminEmail);
    token = await loginAdmin(app, adminEmail);
  });

  beforeEach(() => {
    fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.get(DataSource).query('DROP TABLE IF EXISTS "e2e_sections"');
    await adminRepositoryOf(app).delete({ email: adminEmail });
    await app.close();
    restoreEnv();
  });

  describe('seeding', () => {
    it('creates the row once, dropping empty translations', async () => {
      await expect(
        sectionService.ensureSeeded({
          title: { en: 'Welcome', hy: 'Բարի գալուստ', ru: '' },
          ctaUrl: '/contact',
        }),
      ).resolves.toBe(true);

      expect(await repository.count()).toBe(1);
      expect((await storedSection()).title).toEqual({
        en: 'Welcome',
        hy: 'Բարի գալուստ',
      });
    });

    it('is safe to rerun and never adds a second row', async () => {
      await expect(
        sectionService.ensureSeeded({ title: { en: 'Other' } }),
      ).resolves.toBe(false);
      expect(await repository.count()).toBe(1);
    });
  });

  describe('admin read', () => {
    it('requires an admin token', async () => {
      await request(server()).get('/e2e-section').expect(401);
    });

    it('returns every language as a full object', async () => {
      const response = await request(server())
        .get('/e2e-section')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        title: { en: 'Welcome', hy: 'Բարի գալուստ' },
        subtitle: null,
        ctaUrl: '/contact',
        isActive: true,
      });
    });
  });

  describe('public read', () => {
    it('returns plain strings in the requested language, without auth', async () => {
      const response = await request(server())
        .get('/e2e-section/active')
        .set('x-language', 'hy')
        .expect(200);

      expect(response.body.data).toMatchObject({
        title: 'Բարի գալուստ',
        subtitle: null,
        ctaUrl: '/contact',
      });
      expect(response.body.data.isActive).toBeUndefined();
    });

    it('falls back to the default language when a translation is missing', async () => {
      const response = await request(server())
        .get('/e2e-section/active')
        .set('x-language', 'ru')
        .expect(200);

      expect(response.body.data.title).toBe('Welcome');
    });
  });

  describe('update', () => {
    it('requires an admin token', async () => {
      await request(server())
        .patch('/e2e-section')
        .send({ ctaUrl: '/x' })
        .expect(401);
    });

    it('merges a new translation instead of replacing the field', async () => {
      const response = await patch({
        title: { ru: '  Добро пожаловать  ' },
      }).expect(200);

      expect(response.body.data.title).toEqual({
        en: 'Welcome',
        hy: 'Բարի գալուստ',
        ru: 'Добро пожаловать',
      });
      expect((await storedSection()).title).toEqual(response.body.data.title);
    });

    it('removes a translation sent as an empty string, never storing it', async () => {
      await patch({ title: { ru: '' } }).expect(200);

      expect((await storedSection()).title).toEqual({
        en: 'Welcome',
        hy: 'Բարի գալուստ',
      });
    });

    it('rejects clearing the default language of a required field', async () => {
      const response = await patch({ title: { en: '' } }).expect(400);

      expect(response.body.errors).toEqual([
        { field: 'title', message: expect.any(String) },
      ]);
    });

    it('rejects a language that is not supported', async () => {
      await patch({ title: { de: 'Willkommen' } }).expect(400);
    });

    it('rejects null for a required translated field', async () => {
      await patch({ title: null }).expect(400);
    });

    it('lets a nullable field lose its last translation, storing null', async () => {
      await patch({ subtitle: { en: 'Fresh' } }).expect(200);
      expect((await storedSection()).subtitle).toEqual({ en: 'Fresh' });

      await patch({ subtitle: { en: '' } }).expect(200);
      expect((await storedSection()).subtitle).toBeNull();
    });

    it('emits ContentChangedEvent with the section tag, revalidating the website', async () => {
      await patch({ ctaUrl: '/book' }).expect(200);

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          'https://website.example.com/api/revalidate',
          expect.objectContaining({
            headers: expect.objectContaining({
              'x-revalidate-secret': secret,
            }),
            body: JSON.stringify({ tags: [E2E_SECTION_TAG] }),
          }),
        ),
      );
    });

    it('does not emit when validation rejects the request', async () => {
      await patch({ title: { en: '' } }).expect(400);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('still saves when the website is down, logging the revalidation failure', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
      const errorLog = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      await patch({ ctaUrl: '/while-website-down' }).expect(200);

      expect((await storedSection()).ctaUrl).toBe('/while-website-down');
      await waitFor(() => expect(errorLog).toHaveBeenCalled());
    });

    it('a rerun of the seeder does not overwrite what the admin edited', async () => {
      await sectionService.ensureSeeded({ title: { en: 'Seeded again' } });

      expect((await storedSection()).title.en).toBe('Welcome');
      expect((await storedSection()).ctaUrl).toBe('/while-website-down');
    });
  });

  describe('active flag and missing row', () => {
    it('hides an inactive section from the public with 404, while admins still read it', async () => {
      await patch({ isActive: false }).expect(200);

      const response = await request(server())
        .get('/e2e-section/active')
        .expect(404);
      expect(response.body).toMatchObject({
        success: false,
        statusCode: 404,
        message: 'This section was not found.',
      });

      await request(server())
        .get('/e2e-section')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('returns 404 when the row was never seeded', async () => {
      await repository.clear();

      await request(server())
        .get('/e2e-section')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      await patch({ ctaUrl: '/x' }).expect(404);
    });
  });
});
