import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from 'src/app.module';
import { AdminEntity } from 'src/modules/admin/entities';
import { AdminRole } from 'src/modules/admin/enums';
import { ContactPhoneEntity } from 'src/modules/contact-phone/entities';

describe('ContactPhone (e2e)', () => {
  let app: INestApplication;
  let contactPhoneRepository: Repository<ContactPhoneEntity>;
  let adminRepository: Repository<AdminEntity>;
  let adminToken: string;

  const adminEmail = 'e2e-contact-phone-admin@jeenj.com';
  const adminPassword = 'AdminPass123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    contactPhoneRepository = moduleFixture.get(
      getRepositoryToken(ContactPhoneEntity),
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
    await contactPhoneRepository.delete({ phone: '+37455111111' });
    await contactPhoneRepository.delete({ phone: '+37455222222' });
    await contactPhoneRepository.delete({ phone: '+37455333333' });
    await contactPhoneRepository.delete({ phone: '+37455444444' });
    await contactPhoneRepository.delete({ phone: '+37455555555' });
    await adminRepository.delete({ email: adminEmail });
    await app.close();
  });

  describe('POST /contact-phones (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .post('/contact-phones')
        .send({ phone: '+37455111111' })
        .expect(401);
    });

    it('rejects an invalid phone number', async () => {
      await request(app.getHttpServer())
        .post('/contact-phones')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: 'not-a-phone' })
        .expect(400);
    });

    it('adds a new phone number, even with nothing in the list yet', async () => {
      const response = await request(app.getHttpServer())
        .post('/contact-phones')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: '+37455111111' })
        .expect(201);

      expect(response.body.data.phone).toBe('+37455111111');
      expect(response.body.data.isActive).toBe(true);
    });

    it('rejects a duplicate phone number', async () => {
      await request(app.getHttpServer())
        .post('/contact-phones')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: '+37455111111' })
        .expect(409);
    });
  });

  describe('GET /contact-phones (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer()).get('/contact-phones').expect(401);
    });

    it('returns every phone regardless of status', async () => {
      const response = await request(app.getHttpServer())
        .get('/contact-phones')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(
        (response.body.data as ContactPhoneEntity[]).some(
          (item) => item.phone === '+37455111111',
        ),
      ).toBe(true);
    });
  });

  describe('PATCH /contact-phones/:id (admin-guarded)', () => {
    it('updates the phone number', async () => {
      const created = await request(app.getHttpServer())
        .post('/contact-phones')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: '+37455222222' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .patch(`/contact-phones/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: '+37455333333' })
        .expect(200);

      expect(response.body.data.phone).toBe('+37455333333');
    });

    it('disables and re-enables a phone without touching the number', async () => {
      const created = await request(app.getHttpServer())
        .post('/contact-phones')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: '+37455444444' })
        .expect(201);

      const disabled = await request(app.getHttpServer())
        .patch(`/contact-phones/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(disabled.body.data.isActive).toBe(false);
      expect(disabled.body.data.phone).toBe('+37455444444');

      const enabled = await request(app.getHttpServer())
        .patch(`/contact-phones/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true })
        .expect(200);

      expect(enabled.body.data.isActive).toBe(true);
    });
  });

  describe('DELETE /contact-phones/:id (admin-guarded)', () => {
    it('removes the phone', async () => {
      const created = await request(app.getHttpServer())
        .post('/contact-phones')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: '+37455555555' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/contact-phones/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/contact-phones')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(
        (response.body.data as ContactPhoneEntity[]).some(
          (item) => item.id === created.body.data.id,
        ),
      ).toBe(false);
    });
  });

  describe('GET /contact-phones/active (public)', () => {
    it('requires no token', async () => {
      await request(app.getHttpServer())
        .get('/contact-phones/active')
        .expect(200);
    });

    it('excludes a disabled phone', async () => {
      const response = await request(app.getHttpServer())
        .get('/contact-phones/active')
        .expect(200);

      expect(
        (response.body.data as ContactPhoneEntity[]).some(
          (item) => item.phone === '+37455333333' && item.isActive === false,
        ),
      ).toBe(false);
    });

    it('includes an active phone', async () => {
      const response = await request(app.getHttpServer())
        .get('/contact-phones/active')
        .expect(200);

      expect(
        (response.body.data as ContactPhoneEntity[]).some(
          (item) => item.phone === '+37455111111',
        ),
      ).toBe(true);
    });
  });
});
