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
import { TalkToUsSectionEntity } from 'src/modules/talk-to-us/entities';
import { TalkToUsService } from 'src/modules/talk-to-us/talk-to-us.service';

describe('TalkToUs (e2e)', () => {
  let app: INestApplication;
  let sectionRepository: Repository<TalkToUsSectionEntity>;
  let mediaAssetRepository: Repository<MediaAssetEntity>;
  let adminRepository: Repository<AdminEntity>;
  let adminToken: string;
  let originalSectionState: {
    id: number;
    title: TranslatedTextPatch | null;
    text: TranslatedTextPatch | null;
    mediaAssetId: number | null;
  };
  const mediaAssetIds: number[] = [];

  const adminEmail = 'e2e-talk-to-us-admin@jeenj.com';
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
      getRepositoryToken(TalkToUsSectionEntity),
    );
    mediaAssetRepository = moduleFixture.get(
      getRepositoryToken(MediaAssetEntity),
    );
    adminRepository = moduleFixture.get(getRepositoryToken(AdminEntity));

    await moduleFixture.get(TalkToUsService).ensureSeeded();

    const [section] = await sectionRepository.find({ take: 1 });
    originalSectionState = {
      id: section.id,
      title: section.title,
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
      title: originalSectionState.title,
      text: originalSectionState.text,
      mediaAssetId: originalSectionState.mediaAssetId,
    });
    await mediaAssetRepository.delete({
      id: In(mediaAssetIds.length ? mediaAssetIds : [-1]),
    });
    await adminRepository.delete({ email: adminEmail });
    await app.close();
  });

  describe('GET /talk-to-us (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer()).get('/talk-to-us').expect(401);
    });

    it('returns the singleton section, even with nothing configured yet', async () => {
      const response = await request(app.getHttpServer())
        .get('/talk-to-us')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.id).toBeDefined();
    });
  });

  describe('PATCH /talk-to-us (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .patch('/talk-to-us')
        .send({ title: { en: 'Talk to us' } })
        .expect(401);
    });

    it('rejects a key given without a purpose', async () => {
      await request(app.getHttpServer())
        .patch('/talk-to-us')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ key: 'talk-to-us-image/new.webp' })
        .expect(400);
    });

    it('rejects a title that is not a translated object', async () => {
      await request(app.getHttpServer())
        .patch('/talk-to-us')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Talk to us' })
        .expect(400);
    });

    it('rejects text in an unsupported language', async () => {
      await request(app.getHttpServer())
        .patch('/talk-to-us')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: { de: 'Wir helfen' } })
        .expect(400);
    });

    it('updates title and text without requiring media', async () => {
      const response = await request(app.getHttpServer())
        .patch('/talk-to-us')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { en: 'Talk to us', hy: 'Կապվեք մեզ հետ', ru: '' },
          text: { en: "We're here to help", hy: 'Մենք այստեղ ենք', ru: '' },
        })
        .expect(200);

      expect(response.body.data.title).toEqual({
        en: 'Talk to us',
        hy: 'Կապվեք մեզ հետ',
      });
      expect(response.body.data.text).toEqual({
        en: "We're here to help",
        hy: 'Մենք այստեղ ենք',
      });
    });

    it('merges a partial translation into the stored title', async () => {
      const added = await request(app.getHttpServer())
        .patch('/talk-to-us')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: { ru: 'Свяжитесь с нами' } })
        .expect(200);

      expect(added.body.data.title).toEqual({
        en: 'Talk to us',
        hy: 'Կապվեք մեզ հետ',
        ru: 'Свяжитесь с нами',
      });
      expect(added.body.data.text).toEqual({
        en: "We're here to help",
        hy: 'Մենք այստեղ ենք',
      });

      const removed = await request(app.getHttpServer())
        .patch('/talk-to-us')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: { ru: '' } })
        .expect(200);

      expect(removed.body.data.title).toEqual({
        en: 'Talk to us',
        hy: 'Կապվեք մեզ հետ',
      });
    });

    it('sets the media when key and purpose are given together', async () => {
      const response = await request(app.getHttpServer())
        .patch('/talk-to-us')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: 'talk-to-us-video/e2e-test.mp4',
          purpose: 'talk-to-us-video',
        })
        .expect(200);

      expect(response.body.data.mediaAssetId).toBeDefined();
      mediaAssetIds.push(response.body.data.mediaAssetId as number);
    });
  });

  describe('GET /talk-to-us/active (public)', () => {
    it('requires no token', async () => {
      await request(app.getHttpServer()).get('/talk-to-us/active').expect(200);
    });

    it('returns the title, text and resolved media', async () => {
      const response = await request(app.getHttpServer())
        .get('/talk-to-us/active')
        .expect(200);

      expect(response.body.data.title).toBe('Talk to us');
      expect(response.body.data.text).toBe("We're here to help");
      expect(response.body.data.media.url).toBe('https://media-url');
    });

    it('returns the title and text in the language given by the language header', async () => {
      const response = await request(app.getHttpServer())
        .get('/talk-to-us/active')
        .set('language', 'hy')
        .expect(200);

      expect(response.body.data.title).toBe('Կապվեք մեզ հետ');
      expect(response.body.data.text).toBe('Մենք այստեղ ենք');
    });

    it('falls back to English when the requested language is untranslated', async () => {
      const response = await request(app.getHttpServer())
        .get('/talk-to-us/active')
        .set('language', 'ru')
        .expect(200);

      expect(response.body.data.title).toBe('Talk to us');
      expect(response.body.data.text).toBe("We're here to help");
    });
  });
});
