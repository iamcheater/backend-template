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
import { PrivacyPolicyEntity } from 'src/modules/privacy-policy/entities';
import { PrivacyPolicyService } from 'src/modules/privacy-policy/privacy-policy.service';

describe('PrivacyPolicy (e2e)', () => {
  let app: INestApplication;
  let policyRepository: Repository<PrivacyPolicyEntity>;
  let adminRepository: Repository<AdminEntity>;
  let adminToken: string;
  let originalPolicyState: {
    id: number;
    content: TranslatedTextPatch | null;
  };

  const adminEmail = 'e2e-privacy-policy-admin@jeenj.com';
  const adminPassword = 'AdminPass123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    policyRepository = moduleFixture.get(
      getRepositoryToken(PrivacyPolicyEntity),
    );
    adminRepository = moduleFixture.get(getRepositoryToken(AdminEntity));

    await moduleFixture.get(PrivacyPolicyService).ensureSeeded();

    const [policy] = await policyRepository.find({ take: 1 });
    originalPolicyState = { id: policy.id, content: policy.content };

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
    await policyRepository.update(originalPolicyState.id, {
      content: originalPolicyState.content,
    });
    await adminRepository.delete({ email: adminEmail });
    await app.close();
  });

  describe('GET /privacy-policy (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer()).get('/privacy-policy').expect(401);
    });

    it('returns the singleton policy, even with nothing configured yet', async () => {
      const response = await request(app.getHttpServer())
        .get('/privacy-policy')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.id).toBeDefined();
    });
  });

  describe('PATCH /privacy-policy (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .patch('/privacy-policy')
        .send({ content: { en: '<p>Policy</p>' } })
        .expect(401);
    });

    it('rejects content that is not a translated object', async () => {
      await request(app.getHttpServer())
        .patch('/privacy-policy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: '<p>Policy</p>' })
        .expect(400);
    });

    it('rejects content in an unsupported language', async () => {
      await request(app.getHttpServer())
        .patch('/privacy-policy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: { de: '<p>Policy</p>' } })
        .expect(400);
    });

    it('updates the content', async () => {
      const response = await request(app.getHttpServer())
        .patch('/privacy-policy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content: {
            en: '<h1>Privacy Policy</h1><p>We respect your privacy.</p>',
            hy: '<h1>Գաղտնիության քաղաքականություն</h1>',
            ru: '',
          },
        })
        .expect(200);

      expect(response.body.data.content).toEqual({
        en: '<h1>Privacy Policy</h1><p>We respect your privacy.</p>',
        hy: '<h1>Գաղտնիության քաղաքականություն</h1>',
      });
    });

    it('merges a partial translation into the stored content', async () => {
      const added = await request(app.getHttpServer())
        .patch('/privacy-policy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: { ru: '<h1>Политика конфиденциальности</h1>' } })
        .expect(200);

      expect(added.body.data.content).toEqual({
        en: '<h1>Privacy Policy</h1><p>We respect your privacy.</p>',
        hy: '<h1>Գաղտնիության քաղաքականություն</h1>',
        ru: '<h1>Политика конфиденциальности</h1>',
      });

      const removed = await request(app.getHttpServer())
        .patch('/privacy-policy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: { ru: '' } })
        .expect(200);

      expect(removed.body.data.content).toEqual({
        en: '<h1>Privacy Policy</h1><p>We respect your privacy.</p>',
        hy: '<h1>Գաղտնիության քաղաքականություն</h1>',
      });
    });
  });

  describe('GET /privacy-policy/active (public)', () => {
    it('requires no token', async () => {
      await request(app.getHttpServer())
        .get('/privacy-policy/active')
        .expect(200);
    });

    it('returns the content and when it was last updated', async () => {
      const response = await request(app.getHttpServer())
        .get('/privacy-policy/active')
        .expect(200);

      expect(response.body.data.content).toBe(
        '<h1>Privacy Policy</h1><p>We respect your privacy.</p>',
      );
      expect(Number.isNaN(Date.parse(response.body.data.updatedAt))).toBe(
        false,
      );
    });

    it('returns the content in the language given by the language header', async () => {
      const response = await request(app.getHttpServer())
        .get('/privacy-policy/active')
        .set('language', 'hy')
        .expect(200);

      expect(response.body.data.content).toBe(
        '<h1>Գաղտնիության քաղաքականություն</h1>',
      );
      expect(Number.isNaN(Date.parse(response.body.data.updatedAt))).toBe(
        false,
      );
    });

    it('falls back to English when the requested language is untranslated', async () => {
      const response = await request(app.getHttpServer())
        .get('/privacy-policy/active')
        .set('language', 'ru')
        .expect(200);

      expect(response.body.data.content).toBe(
        '<h1>Privacy Policy</h1><p>We respect your privacy.</p>',
      );
    });
  });
});
