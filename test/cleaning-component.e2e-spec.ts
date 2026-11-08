import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { In, Repository } from 'typeorm';
import { AppModule } from 'src/app.module';
import { AdminEntity } from 'src/modules/admin/entities';
import { AdminRole } from 'src/modules/admin/enums';
import { CleaningComponentEntity } from 'src/modules/cleaning-component/entities';

describe('CleaningComponent (e2e)', () => {
  let app: INestApplication;
  let componentRepository: Repository<CleaningComponentEntity>;
  let adminRepository: Repository<AdminEntity>;
  let adminToken: string;
  const componentIds: number[] = [];

  const adminEmail = 'e2e-cleaning-component-admin@jeenj.com';
  const adminPassword = 'AdminPass123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    componentRepository = moduleFixture.get(
      getRepositoryToken(CleaningComponentEntity),
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
    await adminRepository.delete({ email: adminEmail });
    await componentRepository.delete({
      id: In(componentIds.length ? componentIds : [-1]),
    });
    await app.close();
  });

  describe('POST /cleaning-components (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .post('/cleaning-components')
        .send({ title: { en: 'Dust removal' } })
        .expect(401);
    });

    it('rejects a plain string title', async () => {
      await request(app.getHttpServer())
        .post('/cleaning-components')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Dust removal' })
        .expect(400);
    });

    it('rejects a title without English', async () => {
      await request(app.getHttpServer())
        .post('/cleaning-components')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: { hy: 'Փոշու մաքրում' } })
        .expect(400);
    });

    it('creates a component with just a title', async () => {
      const response = await request(app.getHttpServer())
        .post('/cleaning-components')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: { en: 'Dust removal', hy: 'Փոշու մաքրում' } })
        .expect(201);

      expect(response.body.data).toMatchObject({
        title: { en: 'Dust removal', hy: 'Փոշու մաքրում' },
        description: null,
      });
      componentIds.push(response.body.data.id as number);
    });

    it('creates a component with a description', async () => {
      const response = await request(app.getHttpServer())
        .post('/cleaning-components')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { en: 'Window cleaning' },
          description: { en: 'Inside and outside' },
        })
        .expect(201);

      expect(response.body.data).toMatchObject({
        title: { en: 'Window cleaning' },
        description: { en: 'Inside and outside' },
      });
      componentIds.push(response.body.data.id as number);
    });
  });

  describe('GET /cleaning-components (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .get('/cleaning-components')
        .expect(401);
    });

    it('returns every component', async () => {
      const response = await request(app.getHttpServer())
        .get('/cleaning-components')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(
        (response.body.data as { id: number }[]).some((component) =>
          componentIds.includes(component.id),
        ),
      ).toBe(true);
    });

    it('filters by the search query', async () => {
      const response = await request(app.getHttpServer())
        .get('/cleaning-components')
        .query({ search: 'Dust' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const titles = (response.body.data as { title: { en: string } }[]).map(
        (component) => component.title.en,
      );
      expect(titles).toContain('Dust removal');
      expect(titles).not.toContain('Window cleaning');
    });

    it('matches the search query against translated titles too', async () => {
      const response = await request(app.getHttpServer())
        .get('/cleaning-components')
        .query({ search: 'Փոշու' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const ids = (response.body.data as { id: number }[]).map(
        (component) => component.id,
      );
      expect(ids).toContain(componentIds[0]);
      expect(ids).not.toContain(componentIds[1]);
    });
  });

  describe('GET /cleaning-components/:id (admin-guarded)', () => {
    it('returns 404 for a non-existent component', async () => {
      await request(app.getHttpServer())
        .get('/cleaning-components/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('returns the component', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cleaning-components/${componentIds[0]}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(componentIds[0]);
    });
  });

  describe('PATCH /cleaning-components/:id (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .patch(`/cleaning-components/${componentIds[0]}`)
        .send({ title: { en: 'Deep dust removal' } })
        .expect(401);
    });

    it('merges the given translations into the stored ones', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/cleaning-components/${componentIds[0]}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { en: 'Deep dust removal', ru: 'Удаление пыли' },
          description: { en: 'Every surface' },
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        title: {
          en: 'Deep dust removal',
          hy: 'Փոշու մաքրում',
          ru: 'Удаление пыли',
        },
        description: { en: 'Every surface' },
      });
    });

    it('removes a translation set to an empty string', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/cleaning-components/${componentIds[0]}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: { ru: '' } })
        .expect(200);

      expect(response.body.data.title).toEqual({
        en: 'Deep dust removal',
        hy: 'Փոշու մաքրում',
      });
    });

    it('rejects clearing the English title', async () => {
      await request(app.getHttpServer())
        .patch(`/cleaning-components/${componentIds[0]}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: { en: '' } })
        .expect(400);
    });

    it('returns 404 for a non-existent component', async () => {
      await request(app.getHttpServer())
        .patch('/cleaning-components/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: { en: 'Nope' } })
        .expect(404);
    });
  });

  describe('DELETE /cleaning-components/:id (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .delete(`/cleaning-components/${componentIds[1]}`)
        .expect(401);
    });

    it('removes the component', async () => {
      await request(app.getHttpServer())
        .delete(`/cleaning-components/${componentIds[1]}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/cleaning-components/${componentIds[1]}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('returns 404 for a non-existent component', async () => {
      await request(app.getHttpServer())
        .delete('/cleaning-components/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
