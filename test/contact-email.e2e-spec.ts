import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from 'src/app.module';
import { AdminEntity } from 'src/modules/admin/entities';
import { AdminRole } from 'src/modules/admin/enums';
import { ContactEmailEntity } from 'src/modules/contact-email/entities';

describe('ContactEmail (e2e)', () => {
  let app: INestApplication;
  let contactEmailRepository: Repository<ContactEmailEntity>;
  let adminRepository: Repository<AdminEntity>;
  let adminToken: string;

  const adminEmail = 'e2e-contact-email-admin@jeenj.com';
  const adminPassword = 'AdminPass123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    contactEmailRepository = moduleFixture.get(
      getRepositoryToken(ContactEmailEntity),
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
    await contactEmailRepository.delete({ email: 'contact-1@jeenj.com' });
    await contactEmailRepository.delete({ email: 'contact-2@jeenj.com' });
    await contactEmailRepository.delete({ email: 'contact-3@jeenj.com' });
    await contactEmailRepository.delete({ email: 'contact-4@jeenj.com' });
    await contactEmailRepository.delete({ email: 'contact-5@jeenj.com' });
    await adminRepository.delete({ email: adminEmail });
    await app.close();
  });

  describe('POST /contact-emails (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .post('/contact-emails')
        .send({ email: 'contact-1@jeenj.com' })
        .expect(401);
    });

    it('rejects an invalid email address', async () => {
      await request(app.getHttpServer())
        .post('/contact-emails')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('adds a new email, even with nothing in the list yet', async () => {
      const response = await request(app.getHttpServer())
        .post('/contact-emails')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'contact-1@jeenj.com' })
        .expect(201);

      expect(response.body.data.email).toBe('contact-1@jeenj.com');
      expect(response.body.data.isActive).toBe(true);
    });

    it('rejects a duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/contact-emails')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'contact-1@jeenj.com' })
        .expect(409);
    });
  });

  describe('GET /contact-emails (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer()).get('/contact-emails').expect(401);
    });

    it('returns every email regardless of status', async () => {
      const response = await request(app.getHttpServer())
        .get('/contact-emails')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(
        (response.body.data as ContactEmailEntity[]).some(
          (item) => item.email === 'contact-1@jeenj.com',
        ),
      ).toBe(true);
    });
  });

  describe('PATCH /contact-emails/:id (admin-guarded)', () => {
    it('updates the email address', async () => {
      const created = await request(app.getHttpServer())
        .post('/contact-emails')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'contact-2@jeenj.com' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/contact-emails/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'contact-3@jeenj.com' })
        .expect(200);

      expect(response.body.data.email).toBe('contact-3@jeenj.com');
    });

    it('disables and re-enables an email without touching the address', async () => {
      const created = await request(app.getHttpServer())
        .post('/contact-emails')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'contact-4@jeenj.com' })
        .expect(201);

      const disabled = await request(app.getHttpServer())
        .patch(`/contact-emails/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(disabled.body.data.isActive).toBe(false);
      expect(disabled.body.data.email).toBe('contact-4@jeenj.com');

      const enabled = await request(app.getHttpServer())
        .patch(`/contact-emails/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true })
        .expect(200);

      expect(enabled.body.data.isActive).toBe(true);
    });
  });

  describe('DELETE /contact-emails/:id (admin-guarded)', () => {
    it('removes the email', async () => {
      const created = await request(app.getHttpServer())
        .post('/contact-emails')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'contact-5@jeenj.com' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/contact-emails/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/contact-emails')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(
        (response.body.data as ContactEmailEntity[]).some(
          (item) => item.id === created.body.data.id,
        ),
      ).toBe(false);
    });
  });

  describe('GET /contact-emails/active (public)', () => {
    it('requires no token', async () => {
      await request(app.getHttpServer())
        .get('/contact-emails/active')
        .expect(200);
    });

    it('excludes a disabled email', async () => {
      const response = await request(app.getHttpServer())
        .get('/contact-emails/active')
        .expect(200);

      expect(
        (response.body.data as ContactEmailEntity[]).some(
          (item) =>
            item.email === 'contact-3@jeenj.com' && item.isActive === false,
        ),
      ).toBe(false);
    });

    it('includes an active email', async () => {
      const response = await request(app.getHttpServer())
        .get('/contact-emails/active')
        .expect(200);

      expect(
        (response.body.data as ContactEmailEntity[]).some(
          (item) => item.email === 'contact-1@jeenj.com',
        ),
      ).toBe(true);
    });
  });
});
