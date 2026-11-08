import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { In, Repository } from 'typeorm';
import { AppModule } from 'src/app.module';
import { AdminEntity } from 'src/modules/admin/entities';
import { AdminRole } from 'src/modules/admin/enums';
import { HeroSlideEntity } from 'src/modules/hero-section/entities';
import { MediaAssetEntity } from 'src/modules/media/entities';
import { S3Service } from 'src/modules/media/s3.service';

describe('HeroSection (e2e)', () => {
  let app: INestApplication;
  let heroSlideRepository: Repository<HeroSlideEntity>;
  let mediaAssetRepository: Repository<MediaAssetEntity>;
  let adminRepository: Repository<AdminEntity>;
  let adminToken: string;
  const mediaAssetIds: number[] = [];

  const adminEmail = 'e2e-hero-admin@jeenj.com';
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

    heroSlideRepository = moduleFixture.get(
      getRepositoryToken(HeroSlideEntity),
    );
    mediaAssetRepository = moduleFixture.get(
      getRepositoryToken(MediaAssetEntity),
    );
    adminRepository = moduleFixture.get(getRepositoryToken(AdminEntity));

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
    await heroSlideRepository.delete({
      mediaAssetId: In(mediaAssetIds.length ? mediaAssetIds : [-1]),
    });
    await mediaAssetRepository.delete({
      id: In(mediaAssetIds.length ? mediaAssetIds : [-1]),
    });
    await adminRepository.delete({ email: adminEmail });
    await app.close();
  });

  const createSlide = async (order = 0) => {
    const response = await request(app.getHttpServer())
      .post('/hero-slides')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ key: 'hero-video/e2e-test.mp4', purpose: 'hero-video', order })
      .expect(201);
    mediaAssetIds.push(response.body.data.mediaAssetId as number);

    return response.body.data as HeroSlideEntity;
  };

  describe('POST /hero-slides (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .post('/hero-slides')
        .send({ key: 'hero-video/abc.mp4', purpose: 'hero-video' })
        .expect(401);
    });

    it('rejects a purpose outside the hero upload purposes', async () => {
      await request(app.getHttpServer())
        .post('/hero-slides')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ key: 'service-image/abc.webp', purpose: 'service-image' })
        .expect(400);
    });

    it('creates a slide immediately, even with nothing in the table yet', async () => {
      const slide = await createSlide(0);

      expect(slide.id).toBeDefined();
      expect(slide.order).toBe(0);
      expect(slide.isActive).toBe(true);
    });
  });

  describe('GET /hero-slides (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer()).get('/hero-slides').expect(401);
    });

    it('returns every slide regardless of status', async () => {
      const slide = await createSlide(1);

      const response = await request(app.getHttpServer())
        .get('/hero-slides')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(
        (response.body.data as HeroSlideEntity[]).some(
          (item) => item.id === slide.id,
        ),
      ).toBe(true);
    });
  });

  describe('PATCH /hero-slides/:id (admin-guarded)', () => {
    it('rejects a key given without a purpose', async () => {
      const slide = await createSlide(2);

      await request(app.getHttpServer())
        .patch(`/hero-slides/${slide.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ key: 'hero-video/new.mp4' })
        .expect(400);
    });

    it('updates order and isActive', async () => {
      const slide = await createSlide(3);

      const response = await request(app.getHttpServer())
        .patch(`/hero-slides/${slide.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ order: 9, isActive: false })
        .expect(200);

      expect(response.body.data.order).toBe(9);
      expect(response.body.data.isActive).toBe(false);
    });
  });

  describe('DELETE /hero-slides/:id (admin-guarded)', () => {
    it('removes the slide', async () => {
      const slide = await createSlide(4);

      await request(app.getHttpServer())
        .delete(`/hero-slides/${slide.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/hero-slides')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(
        (response.body.data as HeroSlideEntity[]).some(
          (item) => item.id === slide.id,
        ),
      ).toBe(false);
    });
  });

  describe('GET /hero-slides/active (public)', () => {
    it('requires no token', async () => {
      await request(app.getHttpServer()).get('/hero-slides/active').expect(200);
    });

    it('only returns active, ready slides with resolved media urls', async () => {
      const slide = await createSlide(5);

      const response = await request(app.getHttpServer())
        .get('/hero-slides/active')
        .expect(200);

      const found = (
        response.body.data as { id: number; media: { url: string } }[]
      ).find((item) => item.id === slide.id);

      expect(found).toBeDefined();
      expect(found?.media.url).toBe('https://media-url');
    });

    it('excludes a slide once it is deactivated', async () => {
      const slide = await createSlide(6);

      await request(app.getHttpServer())
        .patch(`/hero-slides/${slide.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/hero-slides/active')
        .expect(200);

      expect(
        (response.body.data as { id: number }[]).some(
          (item) => item.id === slide.id,
        ),
      ).toBe(false);
    });
  });
});
