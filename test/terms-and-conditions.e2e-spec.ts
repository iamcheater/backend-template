import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from 'src/app.module';
import { TranslatedTextPatch } from 'src/common/types';
import { AdminEntity } from 'src/modules/admin/entities';
import { AdminRole } from 'src/modules/admin/enums';
import { TermsAndConditionsEntity } from 'src/modules/terms-and-conditions/entities';
import { TermsAndConditionsService } from 'src/modules/terms-and-conditions/terms-and-conditions.service';

describe('TermsAndConditions (e2e)', () => {
  let app: INestApplication;
  let termsRepository: Repository<TermsAndConditionsEntity>;
  let adminRepository: Repository<AdminEntity>;
  let adminToken: string;
  let originalTermsState: {
    id: number;
    content: TranslatedTextPatch | null;
  };

  const adminEmail = 'e2e-terms-and-conditions-admin@jeenj.com';
  const adminPassword = 'AdminPass123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    termsRepository = moduleFixture.get(
      getRepositoryToken(TermsAndConditionsEntity),
    );
    adminRepository = moduleFixture.get(getRepositoryToken(AdminEntity));

    await moduleFixture.get(TermsAndConditionsService).ensureSeeded();

    const [terms] = await termsRepository.find({ take: 1 });
    originalTermsState = { id: terms.id, content: terms.content };

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
    await termsRepository.update(originalTermsState.id, {
      content: originalTermsState.content,
    });
    await adminRepository.delete({ email: adminEmail });
    await app.close();
  });

  describe('GET /terms-and-conditions (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .get('/terms-and-conditions')
        .expect(401);
    });

    it('returns the singleton terms, even with nothing configured yet', async () => {
      const response = await request(app.getHttpServer())
        .get('/terms-and-conditions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.id).toBeDefined();
    });
  });

  describe('PATCH /terms-and-conditions (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .patch('/terms-and-conditions')
        .send({ content: { en: '<p>Terms</p>' } })
        .expect(401);
    });

    it('rejects content that is not a translated object', async () => {
      await request(app.getHttpServer())
        .patch('/terms-and-conditions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: '<p>Terms</p>' })
        .expect(400);
    });

    it('rejects content in an unsupported language', async () => {
      await request(app.getHttpServer())
        .patch('/terms-and-conditions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: { de: '<p>Terms</p>' } })
        .expect(400);
    });

    it('updates the content', async () => {
      const response = await request(app.getHttpServer())
        .patch('/terms-and-conditions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content: {
            en: '<h1>Terms and Conditions</h1><p>By using this service...</p>',
            hy: '<h1>Պայմաններ և դրույթներ</h1>',
            ru: '',
          },
        })
        .expect(200);

      expect(response.body.data.content).toEqual({
        en: '<h1>Terms and Conditions</h1><p>By using this service...</p>',
        hy: '<h1>Պայմաններ և դրույթներ</h1>',
      });
    });

    it('merges a partial translation into the stored content', async () => {
      const added = await request(app.getHttpServer())
        .patch('/terms-and-conditions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: { ru: '<h1>Условия использования</h1>' } })
        .expect(200);

      expect(added.body.data.content).toEqual({
        en: '<h1>Terms and Conditions</h1><p>By using this service...</p>',
        hy: '<h1>Պայմաններ և դրույթներ</h1>',
        ru: '<h1>Условия использования</h1>',
      });

      const removed = await request(app.getHttpServer())
        .patch('/terms-and-conditions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: { ru: '' } })
        .expect(200);

      expect(removed.body.data.content).toEqual({
        en: '<h1>Terms and Conditions</h1><p>By using this service...</p>',
        hy: '<h1>Պայմաններ և դրույթներ</h1>',
      });
    });
  });

  describe('GET /terms-and-conditions/active (public)', () => {
    it('requires no token', async () => {
      await request(app.getHttpServer())
        .get('/terms-and-conditions/active')
        .expect(200);
    });

    it('returns the content and when it was last updated', async () => {
      const response = await request(app.getHttpServer())
        .get('/terms-and-conditions/active')
        .expect(200);

      expect(response.body.data.content).toBe(
        '<h1>Terms and Conditions</h1><p>By using this service...</p>',
      );
      expect(Number.isNaN(Date.parse(response.body.data.updatedAt))).toBe(
        false,
      );
    });

    it('returns the content in the language given by the language header', async () => {
      const response = await request(app.getHttpServer())
        .get('/terms-and-conditions/active')
        .set('language', 'hy')
        .expect(200);

      expect(response.body.data.content).toBe('<h1>Պայմաններ և դրույթներ</h1>');
      expect(Number.isNaN(Date.parse(response.body.data.updatedAt))).toBe(
        false,
      );
    });

    it('falls back to English when the requested language is untranslated', async () => {
      const response = await request(app.getHttpServer())
        .get('/terms-and-conditions/active')
        .set('language', 'ru')
        .expect(200);

      expect(response.body.data.content).toBe(
        '<h1>Terms and Conditions</h1><p>By using this service...</p>',
      );
    });
  });
});
