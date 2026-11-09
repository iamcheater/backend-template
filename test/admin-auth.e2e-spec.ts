import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { In } from 'typeorm';
import { AppModule } from 'src/app.module';
import { AdminRole } from 'src/core/admin/enums';
import {
  adminRepositoryOf,
  createAdmin,
  loginAdmin,
  overrideEnv,
} from './helpers';

interface ErrorBody {
  success: boolean;
  statusCode: number;
  message: string;
}

describe('Admin auth (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let restoreEnv: () => void;

  const emails = {
    expiry: 'e2e-auth-expiry@example.com',
    deleted: 'e2e-auth-deleted@example.com',
    demoted: 'e2e-auth-demoted@example.com',
  };

  const expectUnauthorized = (body: ErrorBody) =>
    expect(body).toMatchObject({
      success: false,
      statusCode: 401,
      message: 'You are not authorized to perform this action.',
    });

  beforeAll(async () => {
    restoreEnv = overrideEnv({ ADMIN_JWT_EXPIRES_IN: '2h' });

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    jwtService = moduleFixture.get(JwtService, { strict: false });
  });

  afterAll(async () => {
    await adminRepositoryOf(app).delete({ email: In(Object.values(emails)) });
    await app.close();
    restoreEnv();
  });

  describe('token expiry (ADMIN_JWT_EXPIRES_IN)', () => {
    it('issues login tokens that expire after the configured lifetime', async () => {
      await createAdmin(app, emails.expiry);
      const token = await loginAdmin(app, emails.expiry);
      const { iat, exp } = jwtService.decode<{ iat: number; exp: number }>(
        token,
      );

      expect(exp - iat).toBe(2 * 60 * 60);
    });

    it('rejects an expired token with 401', async () => {
      const admin = await adminRepositoryOf(app).findOneByOrFail({
        email: emails.expiry,
      });
      const expiredToken = jwtService.sign(
        { sub: admin.id, email: admin.email, role: admin.role, type: 'admin' },
        { expiresIn: -10 },
      );

      const response = await request(app.getHttpServer())
        .get('/admin/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expectUnauthorized(response.body as ErrorBody);
    });

    it('rejects a token signed with a different secret with 401', async () => {
      const admin = await adminRepositoryOf(app).findOneByOrFail({
        email: emails.expiry,
      });
      const forgedToken = new JwtService({ secret: 'not-the-secret' }).sign({
        sub: admin.id,
        role: AdminRole.SUPER_ADMIN,
        type: 'admin',
      });

      await request(app.getHttpServer())
        .get('/admin/me')
        .set('Authorization', `Bearer ${forgedToken}`)
        .expect(401);
    });

    it('rejects a malformed token with 401', async () => {
      await request(app.getHttpServer())
        .get('/admin/me')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);
    });
  });

  describe('deleted-admin lockout', () => {
    it('locks a deleted admin out immediately with 401, not 404, even with an unexpired token', async () => {
      const admin = await createAdmin(app, emails.deleted);
      const token = await loginAdmin(app, emails.deleted);

      await request(app.getHttpServer())
        .get('/admin/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await adminRepositoryOf(app).delete(admin.id);

      const response = await request(app.getHttpServer())
        .get('/admin/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expectUnauthorized(response.body as ErrorBody);
    });
  });

  describe('roles come from the database, not the token', () => {
    it('drops super_admin access on the next request after a demotion, with 403', async () => {
      const admin = await createAdmin(
        app,
        emails.demoted,
        AdminRole.SUPER_ADMIN,
      );
      const token = await loginAdmin(app, emails.demoted);

      await request(app.getHttpServer())
        .get('/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await adminRepositoryOf(app).update(admin.id, { role: AdminRole.ADMIN });

      const response = await request(app.getHttpServer())
        .get('/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 403,
        message: 'You do not have permission to perform this action.',
      });

      await request(app.getHttpServer())
        .get('/admin/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
