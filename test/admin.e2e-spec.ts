import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from 'src/app.module';
import { AdminEntity } from 'src/modules/admin/entities';
import { AdminRole } from 'src/modules/admin/enums';
import { UserEntity } from 'src/modules/users/entities';

describe('Admin (e2e)', () => {
  let app: INestApplication;
  let adminRepository: Repository<AdminEntity>;
  let userRepository: Repository<UserEntity>;

  const adminPassword = 'AdminPass123!';
  const superAdminPassword = 'SuperAdminPass123!';
  const adminEmail = 'e2e-admin@jeenj.com';
  const superAdminEmail = 'e2e-super-admin@jeenj.com';
  const regularUserEmail = 'e2e-regular-user@jeenj.com';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    adminRepository = moduleFixture.get(getRepositoryToken(AdminEntity));
    userRepository = moduleFixture.get(getRepositoryToken(UserEntity));
    await adminRepository.save([
      adminRepository.create({
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 10),
        role: AdminRole.ADMIN,
      }),
      adminRepository.create({
        email: superAdminEmail,
        password: await bcrypt.hash(superAdminPassword, 10),
        role: AdminRole.SUPER_ADMIN,
      }),
    ]);
  });

  afterAll(async () => {
    await adminRepository.delete({ email: adminEmail });
    await adminRepository.delete({ email: superAdminEmail });
    await userRepository.delete({ email: regularUserEmail });
    await app.close();
  });

  it('POST /admin/login rejects wrong credentials', async () => {
    await request(app.getHttpServer())
      .post('/admin/login')
      .send({ email: adminEmail, password: 'wrong-password' })
      .expect(401);
  });

  it('POST /admin/login returns an access token on valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(201);

    expect(typeof response.body.data.accessToken).toBe('string');
  });

  it('GET /admin/me rejects requests without a token', async () => {
    await request(app.getHttpServer()).get('/admin/me').expect(401);
  });

  it('GET /admin/me returns the authenticated admin profile', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/admin/login')
      .send({ email: superAdminEmail, password: superAdminPassword })
      .expect(201);

    const { accessToken } = loginResponse.body.data;

    const meResponse = await request(app.getHttpServer())
      .get('/admin/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(meResponse.body.data).toMatchObject({
      email: superAdminEmail,
      role: AdminRole.SUPER_ADMIN,
    });
    expect(meResponse.body.data.password).toBeUndefined();
  });

  it('GET /admin/me rejects a regular user token (no cross-domain token reuse)', async () => {
    await userRepository.save(
      userRepository.create({
        email: regularUserEmail,
        password: await bcrypt.hash('UserPass123!', 10),
      }),
    );
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: regularUserEmail, password: 'UserPass123!' })
      .expect(201);

    const { accessToken } = loginResponse.body.data;

    await request(app.getHttpServer())
      .get('/admin/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
  });

  describe('admin management CRUD', () => {
    let adminToken: string;
    let superAdminToken: string;
    let createdAdminToken: string;
    let createdAdminId: number;
    const createdEmail = 'e2e-created-admin@jeenj.com';

    beforeAll(async () => {
      const adminLogin = await request(app.getHttpServer())
        .post('/admin/login')
        .send({ email: adminEmail, password: adminPassword });
      adminToken = adminLogin.body.data.accessToken;

      const superAdminLogin = await request(app.getHttpServer())
        .post('/admin/login')
        .send({ email: superAdminEmail, password: superAdminPassword });
      superAdminToken = superAdminLogin.body.data.accessToken;
    });

    afterAll(async () => {
      await adminRepository.delete({ email: createdEmail });
    });

    it('POST /admin is rejected for a plain admin (403)', async () => {
      await request(app.getHttpServer())
        .post('/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: createdEmail, password: 'CreatedPass123!' })
        .expect(403);
    });

    it('POST /admin rejects a weak password', async () => {
      await request(app.getHttpServer())
        .post('/admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'e2e-weak-password@jeenj.com',
          password: 'weakpassword',
        })
        .expect(400);
    });

    it('POST /admin creates a new admin for a super_admin, always role=admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ email: createdEmail, password: 'CreatedPass123!' })
        .expect(201);

      expect(response.body.data).toMatchObject({
        email: createdEmail,
        role: AdminRole.ADMIN,
      });
      expect(response.body.data.password).toBeUndefined();
      createdAdminId = response.body.data.id;

      const createdLogin = await request(app.getHttpServer())
        .post('/admin/login')
        .send({ email: createdEmail, password: 'CreatedPass123!' });
      createdAdminToken = createdLogin.body.data.accessToken;
    });

    it('POST /admin rejects a duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ email: createdEmail, password: 'CreatedPass123!' })
        .expect(409);
    });

    it('GET /admin is rejected for a plain admin (403)', async () => {
      await request(app.getHttpServer())
        .get('/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('GET /admin returns a paginated page for a super_admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data.data)).toBe(true);
      expect(response.body.data.meta).toMatchObject({ page: 1, take: 10 });
      expect(
        response.body.data.data.some(
          (admin: { id: number }) => admin.id === createdAdminId,
        ),
      ).toBe(true);
    });

    it('GET /admin/:id is rejected for a plain admin (403)', async () => {
      await request(app.getHttpServer())
        .get(`/admin/${createdAdminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('GET /admin/:id returns the admin for a super_admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/${createdAdminId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(createdAdminId);
    });

    it('PATCH /admin/:id no longer exists (self-service only, via /admin/me)', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/${createdAdminId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Should not work' })
        .expect(404);
    });

    it('PATCH /admin/me updates the authenticated admin (self-service)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/admin/me')
        .set('Authorization', `Bearer ${createdAdminToken}`)
        .send({ name: 'Updated' })
        .expect(200);

      expect(response.body.data.name).toBe('Updated');
      expect(response.body.data.email).toBe(createdEmail);
    });

    it('PATCH /admin/me ignores an email field (email is immutable)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/admin/me')
        .set('Authorization', `Bearer ${createdAdminToken}`)
        .send({ email: 'should-not-change@jeenj.com' })
        .expect(200);

      expect(response.body.data.email).toBe(createdEmail);
    });

    it('PATCH /admin/me ignores a password field (password is changed only via /admin/me/password)', async () => {
      await request(app.getHttpServer())
        .patch('/admin/me')
        .set('Authorization', `Bearer ${createdAdminToken}`)
        .send({ password: 'IgnoredPass123!' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/admin/login')
        .send({ email: createdEmail, password: 'CreatedPass123!' })
        .expect(201);
    });

    it('PATCH /admin/me/password rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .patch('/admin/me/password')
        .send({
          currentPassword: 'CreatedPass123!',
          newPassword: 'NewCreatedPass456!',
        })
        .expect(401);
    });

    it('PATCH /admin/me/password rejects a wrong current password', async () => {
      await request(app.getHttpServer())
        .patch('/admin/me/password')
        .set('Authorization', `Bearer ${createdAdminToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewCreatedPass456!',
        })
        .expect(400);
    });

    it('PATCH /admin/me/password rejects a weak new password', async () => {
      await request(app.getHttpServer())
        .patch('/admin/me/password')
        .set('Authorization', `Bearer ${createdAdminToken}`)
        .send({
          currentPassword: 'CreatedPass123!',
          newPassword: 'weakpassword',
        })
        .expect(400);
    });

    it('PATCH /admin/me/password changes the password, and the new password works for login', async () => {
      const newPassword = 'NewCreatedPass456!';

      await request(app.getHttpServer())
        .patch('/admin/me/password')
        .set('Authorization', `Bearer ${createdAdminToken}`)
        .send({ currentPassword: 'CreatedPass123!', newPassword })
        .expect(200);

      await request(app.getHttpServer())
        .post('/admin/login')
        .send({ email: createdEmail, password: 'CreatedPass123!' })
        .expect(401);

      await request(app.getHttpServer())
        .post('/admin/login')
        .send({ email: createdEmail, password: newPassword })
        .expect(201);
    });

    it('DELETE /admin/:id is rejected for a plain admin (403)', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/${createdAdminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('DELETE /admin/:id refuses a super_admin deleting themselves', async () => {
      const self = await adminRepository.findOne({
        where: { email: superAdminEmail },
      });

      await request(app.getHttpServer())
        .delete(`/admin/${self?.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(400);
    });

    it('DELETE /admin/:id deletes another admin for a super_admin', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/${createdAdminId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      await expect(
        adminRepository.findOne({ where: { email: createdEmail } }),
      ).resolves.toBeNull();
    });
  });
});
