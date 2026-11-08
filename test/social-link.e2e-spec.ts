import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from 'src/app.module';
import { AdminEntity } from 'src/modules/admin/entities';
import { AdminRole } from 'src/modules/admin/enums';
import { SocialLinkEntity } from 'src/modules/social-link/entities';
import { SocialPlatform } from 'src/modules/social-link/enums';
import { SocialLinkService } from 'src/modules/social-link/social-link.service';

describe('SocialLink (e2e)', () => {
  let app: INestApplication;
  let socialLinkRepository: Repository<SocialLinkEntity>;
  let adminRepository: Repository<AdminEntity>;
  let adminToken: string;

  const adminEmail = 'e2e-social-link-admin@jeenj.com';
  let originalLinks: SocialLinkEntity[];
  const adminPassword = 'AdminPass123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    socialLinkRepository = moduleFixture.get(
      getRepositoryToken(SocialLinkEntity),
    );
    adminRepository = moduleFixture.get(getRepositoryToken(AdminEntity));

    await moduleFixture.get(SocialLinkService).ensureSeeded();
    originalLinks = await socialLinkRepository.find();

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
    await socialLinkRepository.save(originalLinks);
    await adminRepository.delete({ email: adminEmail });
    await app.close();
  });

  describe('GET /social-links (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer()).get('/social-links').expect(401);
    });

    it('returns every seeded platform', async () => {
      const response = await request(app.getHttpServer())
        .get('/social-links')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(
        Object.values(SocialPlatform).length,
      );
    });
  });

  describe('PATCH /social-links/:platform (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .patch('/social-links/youtube')
        .send({ url: 'https://youtube.com/@jeenj' })
        .expect(401);
    });

    it('rejects a platform outside the fixed set', async () => {
      await request(app.getHttpServer())
        .patch('/social-links/myspace')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ url: 'https://myspace.com/jeenj' })
        .expect(400);
    });

    it('rejects a malformed url', async () => {
      await request(app.getHttpServer())
        .patch('/social-links/youtube')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ url: 'not-a-url' })
        .expect(400);
    });

    it('rejects a url without https://', async () => {
      await request(app.getHttpServer())
        .patch('/social-links/facebook')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ url: 'facebook.com/jeenj' })
        .expect(400);
    });

    it('rejects a url that belongs to another platform', async () => {
      await request(app.getHttpServer())
        .patch('/social-links/facebook')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ url: 'https://youtube.com/@jeenj' })
        .expect(400);
    });

    it('accepts a Viber chat deep link for the viber platform', async () => {
      const response = await request(app.getHttpServer())
        .patch('/social-links/viber')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ url: 'viber://chat?number=%2B37455123456' })
        .expect(200);

      expect(response.body.data.url).toBe('viber://chat?number=%2B37455123456');
      expect(response.body.data.platform).toBe('viber');
    });

    it('rejects a non-web, non-Viber scheme', async () => {
      await request(app.getHttpServer())
        .patch('/social-links/messenger')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ url: 'javascript:alert(1)' })
        .expect(400);
    });

    it('sets the url for an already-seeded platform, no create step needed', async () => {
      const response = await request(app.getHttpServer())
        .patch('/social-links/youtube')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ url: 'https://youtube.com/@jeenj' })
        .expect(200);

      expect(response.body.data.url).toBe('https://youtube.com/@jeenj');
      expect(response.body.data.platform).toBe('youtube');
    });

    it('toggles isActive without clearing the url', async () => {
      const response = await request(app.getHttpServer())
        .patch('/social-links/youtube')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.data.isActive).toBe(false);
      expect(response.body.data.url).toBe('https://youtube.com/@jeenj');
    });
  });

  describe('GET /social-links/active (public)', () => {
    it('requires no token', async () => {
      await request(app.getHttpServer())
        .get('/social-links/active')
        .expect(200);
    });

    it('excludes a platform with no url set', async () => {
      await socialLinkRepository.update(
        { platform: SocialPlatform.FACEBOOK },
        { url: null, isActive: true },
      );

      const response = await request(app.getHttpServer())
        .get('/social-links/active')
        .expect(200);

      expect(
        (response.body.data as SocialLinkEntity[]).some(
          (link) => link.platform === SocialPlatform.FACEBOOK,
        ),
      ).toBe(false);
    });

    it('excludes a platform that is inactive even with a url set', async () => {
      await request(app.getHttpServer())
        .patch('/social-links/youtube')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ url: 'https://youtube.com/@jeenj', isActive: false })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/social-links/active')
        .expect(200);

      expect(
        (response.body.data as SocialLinkEntity[]).some(
          (link) => link.platform === SocialPlatform.YOUTUBE,
        ),
      ).toBe(false);
    });

    it('includes a platform once it has a url and is active', async () => {
      await request(app.getHttpServer())
        .patch('/social-links/youtube')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ url: 'https://youtube.com/@jeenj', isActive: true })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/social-links/active')
        .expect(200);

      const found = (response.body.data as SocialLinkEntity[]).find(
        (link) => link.platform === SocialPlatform.YOUTUBE,
      );

      expect(found?.url).toBe('https://youtube.com/@jeenj');
    });
  });
});
