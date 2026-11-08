import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { In, Repository } from 'typeorm';
import { AppModule } from 'src/app.module';
import { TranslatedTextPatch } from 'src/common/types';
import { AdminEntity } from 'src/modules/admin/entities';
import { AdminRole } from 'src/modules/admin/enums';
import {
  CleanerExpectationEntity,
  ForCleanersSectionEntity,
} from 'src/modules/for-cleaners/entities';
import { ForCleanersSectionService } from 'src/modules/for-cleaners/for-cleaners-section.service';
import { MediaAssetEntity } from 'src/modules/media/entities';
import { S3Service } from 'src/modules/media/s3.service';

describe('ForCleaners (e2e)', () => {
  let app: INestApplication;
  let sectionRepository: Repository<ForCleanersSectionEntity>;
  let expectationRepository: Repository<CleanerExpectationEntity>;
  let mediaAssetRepository: Repository<MediaAssetEntity>;
  let adminRepository: Repository<AdminEntity>;
  let adminToken: string;
  let originalSectionState: {
    id: number;
    title: TranslatedTextPatch | null;
    description: TranslatedTextPatch | null;
    mediaAssetId: number | null;
  };
  const mediaAssetIds: number[] = [];
  const expectationIds: number[] = [];

  const adminEmail = 'e2e-for-cleaners-admin@jeenj.com';
  const adminPassword = 'AdminPass123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3Service)
      .useValue({
        publicUrl: jest.fn().mockReturnValue('https://media-url'),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    sectionRepository = moduleFixture.get(
      getRepositoryToken(ForCleanersSectionEntity),
    );
    expectationRepository = moduleFixture.get(
      getRepositoryToken(CleanerExpectationEntity),
    );
    mediaAssetRepository = moduleFixture.get(
      getRepositoryToken(MediaAssetEntity),
    );
    adminRepository = moduleFixture.get(getRepositoryToken(AdminEntity));

    await moduleFixture.get(ForCleanersSectionService).ensureSeeded();

    const [section] = await sectionRepository.find({ take: 1 });
    originalSectionState = {
      id: section.id,
      title: section.title,
      description: section.description,
      mediaAssetId: section.mediaAssetId,
    };

    await adminRepository.save(
      adminRepository.create({
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 10),
        role: AdminRole.ADMIN,
      }),
    );

    const loginResponse = await request(app.getHttpServer())
      .post('/admin/login')
      .send({ email: adminEmail, password: adminPassword });
    adminToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await sectionRepository.update(originalSectionState.id, {
      title: originalSectionState.title,
      description: originalSectionState.description,
      mediaAssetId: originalSectionState.mediaAssetId,
    });
    await expectationRepository.delete({
      id: In(expectationIds.length ? expectationIds : [-1]),
    });
    await mediaAssetRepository.delete({
      id: In(mediaAssetIds.length ? mediaAssetIds : [-1]),
    });
    await adminRepository.delete({ email: adminEmail });
    await app.close();
  });

  describe('GET /for-cleaners (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer()).get('/for-cleaners').expect(401);
    });

    it('returns the singleton section, even with nothing configured yet', async () => {
      const response = await request(app.getHttpServer())
        .get('/for-cleaners')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.id).toBeDefined();
    });
  });

  describe('PATCH /for-cleaners (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .patch('/for-cleaners')
        .send({ title: { en: 'For Cleaners' } })
        .expect(401);
    });

    it('rejects a key given without a purpose', async () => {
      await request(app.getHttpServer())
        .patch('/for-cleaners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ key: 'for-cleaners-video/new.mp4' })
        .expect(400);
    });

    it('rejects a title that is not a translated object', async () => {
      await request(app.getHttpServer())
        .patch('/for-cleaners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'For Cleaners' })
        .expect(400);
    });

    it('updates title, description, and media together', async () => {
      const response = await request(app.getHttpServer())
        .patch('/for-cleaners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { en: 'For Cleaners', hy: '', ru: '' },
          description: {
            en: 'What we expect from our cleaners',
            hy: '',
            ru: '',
          },
          key: 'for-cleaners-video/e2e-test.mp4',
          purpose: 'for-cleaners-video',
        })
        .expect(200);

      expect(response.body.data.title).toEqual({ en: 'For Cleaners' });
      expect(response.body.data.description).toEqual({
        en: 'What we expect from our cleaners',
      });
      expect(response.body.data.mediaAssetId).toBeDefined();
      mediaAssetIds.push(response.body.data.mediaAssetId as number);
    });

    it('merges a partial translation into the stored title', async () => {
      const response = await request(app.getHttpServer())
        .patch('/for-cleaners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: { hy: 'Մաքրողների համար' } })
        .expect(200);

      expect(response.body.data.title).toEqual({
        en: 'For Cleaners',
        hy: 'Մաքրողների համար',
      });
      expect(response.body.data.description).toEqual({
        en: 'What we expect from our cleaners',
      });
    });
  });

  describe('POST /for-cleaners/expectations (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .post('/for-cleaners/expectations')
        .send({
          title: { en: 'Be on time' },
          description: { en: 'Arrive on schedule' },
        })
        .expect(401);
    });

    it('rejects a title without an English translation', async () => {
      await request(app.getHttpServer())
        .post('/for-cleaners/expectations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { hy: 'Ժամանակին' },
          description: { en: 'Arrive on schedule' },
        })
        .expect(400);
    });

    it('adds a new expectation, even with nothing in the list yet', async () => {
      const response = await request(app.getHttpServer())
        .post('/for-cleaners/expectations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { en: 'Be on time', hy: 'Եղեք ժամանակին' },
          description: { en: 'Arrive on schedule', ru: '' },
          order: 0,
        })
        .expect(201);

      expect(response.body.data.title).toEqual({
        en: 'Be on time',
        hy: 'Եղեք ժամանակին',
      });
      expect(response.body.data.description).toEqual({
        en: 'Arrive on schedule',
      });
      expectationIds.push(response.body.data.id as number);
    });
  });

  describe('GET /for-cleaners/expectations (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .get('/for-cleaners/expectations')
        .expect(401);
    });

    it('returns all expectations', async () => {
      const response = await request(app.getHttpServer())
        .get('/for-cleaners/expectations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(
        (response.body.data as CleanerExpectationEntity[]).some((expectation) =>
          expectationIds.includes(expectation.id),
        ),
      ).toBe(true);
    });
  });

  describe('PATCH /for-cleaners/expectations/:id (admin-guarded)', () => {
    it('updates the expectation', async () => {
      const created = await request(app.getHttpServer())
        .post('/for-cleaners/expectations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { en: 'Bring supplies', hy: 'Բերեք պարագաներ' },
          description: { en: 'Bring your own cleaning supplies' },
          order: 1,
        })
        .expect(201);
      expectationIds.push(created.body.data.id as number);

      const response = await request(app.getHttpServer())
        .patch(`/for-cleaners/expectations/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: { en: 'Bring your own supplies', hy: '' } })
        .expect(200);

      expect(response.body.data.title).toEqual({
        en: 'Bring your own supplies',
      });
      expect(response.body.data.description).toEqual({
        en: 'Bring your own cleaning supplies',
      });
    });
  });

  describe('DELETE /for-cleaners/expectations/:id (admin-guarded)', () => {
    it('removes the expectation', async () => {
      const created = await request(app.getHttpServer())
        .post('/for-cleaners/expectations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { en: 'Be respectful' },
          description: { en: 'Treat the home with respect' },
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/for-cleaners/expectations/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/for-cleaners/expectations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(
        (response.body.data as CleanerExpectationEntity[]).some(
          (expectation) => expectation.id === created.body.data.id,
        ),
      ).toBe(false);
    });
  });

  describe('GET /for-cleaners/active (public)', () => {
    it('requires no token', async () => {
      await request(app.getHttpServer())
        .get('/for-cleaners/active')
        .expect(200);
    });

    it('returns resolved media, title, description, and ordered expectations', async () => {
      const response = await request(app.getHttpServer())
        .get('/for-cleaners/active')
        .expect(200);

      expect(response.body.data.title).toBe('For Cleaners');
      expect(response.body.data.description).toBe(
        'What we expect from our cleaners',
      );
      expect(response.body.data.media.url).toBe('https://media-url');

      const expectations = response.body.data.expectations as {
        id: number;
        title: string;
        description: string;
      }[];

      expect(
        expectations.find(
          (expectation) => expectation.id === expectationIds[0],
        ),
      ).toMatchObject({
        title: 'Be on time',
        description: 'Arrive on schedule',
      });
    });

    it('returns content in the language given by the language header', async () => {
      const response = await request(app.getHttpServer())
        .get('/for-cleaners/active')
        .set('language', 'hy')
        .expect(200);

      expect(response.body.data.title).toBe('Մաքրողների համար');

      const expectations = response.body.data.expectations as {
        id: number;
        title: string;
        description: string;
      }[];

      expect(
        expectations.find(
          (expectation) => expectation.id === expectationIds[0],
        ),
      ).toMatchObject({
        title: 'Եղեք ժամանակին',
        description: 'Arrive on schedule',
      });
    });

    it('falls back to English for an untranslated language', async () => {
      const response = await request(app.getHttpServer())
        .get('/for-cleaners/active')
        .set('language', 'ru')
        .expect(200);

      expect(response.body.data.title).toBe('For Cleaners');
      expect(response.body.data.description).toBe(
        'What we expect from our cleaners',
      );

      const expectations = response.body.data.expectations as {
        id: number;
        title: string;
      }[];

      expect(
        expectations.find((expectation) => expectation.id === expectationIds[0])
          ?.title,
      ).toBe('Be on time');
    });
  });
});
