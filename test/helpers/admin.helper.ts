import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { AdminEntity } from 'src/core/admin/entities';
import { AdminRole } from 'src/core/admin/enums';

export const E2E_ADMIN_PASSWORD = 'AdminPass123!';

export function adminRepositoryOf(
  app: INestApplication,
): Repository<AdminEntity> {
  return app.get<Repository<AdminEntity>>(getRepositoryToken(AdminEntity));
}

export async function createAdmin(
  app: INestApplication,
  email: string,
  role: AdminRole = AdminRole.ADMIN,
): Promise<AdminEntity> {
  const repository = adminRepositoryOf(app);

  return repository.save(
    repository.create({
      email,
      password: await bcrypt.hash(E2E_ADMIN_PASSWORD, 10),
      role,
    }),
  );
}

export async function loginAdmin(
  app: INestApplication,
  email: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/admin/login')
    .send({ email, password: E2E_ADMIN_PASSWORD })
    .expect(201);

  return (response.body as { data: { accessToken: string } }).data.accessToken;
}
