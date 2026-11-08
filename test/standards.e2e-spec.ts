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
import { MediaAssetEntity } from 'src/modules/media/entities';
import { S3Service } from 'src/modules/media/s3.service';
import { StandardsSectionEntity } from 'src/modules/standards/entities';
import { StandardsService } from 'src/modules/standards/standards.service';

describe('Standards (e2e)', () => {
  let app: INestApplication;
  let sectionRepository: Repository<StandardsSectionEntity>;
  let mediaAssetRepository: Repository<MediaAssetEntity>;
  let adminRepository: Repository<AdminEntity>;
  let adminToken: string;
  let originalSectionState: {
    id: number;
    text: TranslatedTextPatch | null;
    mediaAssetId: number | null;
  };
  const mediaAssetIds: number[] = [];

  const adminEmail = 'e2e-standards-admin@jeenj.com';
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
      getRepositoryToken(StandardsSectionEntity),
    );
    mediaAssetRepository = moduleFixture.get(
      getRepositoryToken(MediaAssetEntity),
    );
    adminRepository = moduleFixture.get(getRepositoryToken(AdminEntity));

    await moduleFixture.get(StandardsService).ensureSeeded();

    const [section] = await sectionRepository.find({ take: 1 });
    originalSectionState = {
      id: section.id,
      text: section.text,
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
      text: originalSectionState.text,
      mediaAssetId: originalSectionState.mediaAssetId,
    });
    await mediaAssetRepository.delete({
      id: In(mediaAssetIds.length ? mediaAssetIds : [-1]),
    });
    await adminRepository.delete({ email: adminEmail });
    await app.close();
  });

  describe('GET /standards (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer()).get('/standards').expect(401);
    });

    it('returns the singleton section, even with nothing configured yet', async () => {
      const response = await request(app.getHttpServer())
        .get('/standards')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.id).toBeDefined();
    });
  });

  describe('PATCH /standards (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .patch('/standards')
        .send({ text: { en: 'Our standards' } })
        .expect(401);
    });

    it('rejects a key given without a purpose', async () => {
      await request(app.getHttpServer())
        .patch('/standards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ key: 'standards-image/new.webp' })
        .expect(400);
    });

    it('rejects text that is not a translated object', async () => {
      await request(app.getHttpServer())
        .patch('/standards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: 'We hold ourselves to a high standard' })
        .expect(400);
    });

    it('rejects text in an unsupported language', async () => {
      await request(app.getHttpServer())
        .patch('/standards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: { de: 'Unsere Standards' } })
        .expect(400);
    });

    it('updates the text without requiring media', async () => {
      const response = await request(app.getHttpServer())
        .patch('/standards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          text: {
            en: 'We hold ourselves to a high standard',
            hy: 'Մենք ունենք բարձր չափանիշներ',
            ru: '',
          },
        })
        .expect(200);

      expect(response.body.data.text).toEqual({
        en: 'We hold ourselves to a high standard',
        hy: 'Մենք ունենք բարձր չափանիշներ',
      });
    });

    it('merges a partial translation into the stored text', async () => {
      const added = await request(app.getHttpServer())
        .patch('/standards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: { ru: 'Высокие стандарты' } })
        .expect(200);

      expect(added.body.data.text).toEqual({
        en: 'We hold ourselves to a high standard',
        hy: 'Մենք ունենք բարձր չափանիշներ',
        ru: 'Высокие стандарты',
      });

      const removed = await request(app.getHttpServer())
        .patch('/standards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: { ru: '' } })
        .expect(200);

      expect(removed.body.data.text).toEqual({
        en: 'We hold ourselves to a high standard',
        hy: 'Մենք ունենք բարձր չափանիշներ',
      });
    });

    it('sets the media when key and purpose are given together', async () => {
      const response = await request(app.getHttpServer())
        .patch('/standards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: 'standards-video/e2e-test.mp4',
          purpose: 'standards-video',
        })
        .expect(200);

      expect(response.body.data.mediaAssetId).toBeDefined();
      mediaAssetIds.push(response.body.data.mediaAssetId as number);
    });
  });

  describe('GET /standards/active (public)', () => {
    it('requires no token', async () => {
      await request(app.getHttpServer()).get('/standards/active').expect(200);
    });

    it('returns the text and resolved media', async () => {
      const response = await request(app.getHttpServer())
        .get('/standards/active')
        .expect(200);

      expect(response.body.data.text).toBe(
        'We hold ourselves to a high standard',
      );
      expect(response.body.data.media.url).toBe('https://media-url');
    });

    it('returns the text in the language given by the language header', async () => {
      const response = await request(app.getHttpServer())
        .get('/standards/active')
        .set('language', 'hy')
        .expect(200);

      expect(response.body.data.text).toBe('Մենք ունենք բարձր չափանիշներ');
    });

    it('falls back to English when the requested language is untranslated', async () => {
      const response = await request(app.getHttpServer())
        .get('/standards/active')
        .set('language', 'ru')
        .expect(200);

      expect(response.body.data.text).toBe(
        'We hold ourselves to a high standard',
      );
    });
  });
});
