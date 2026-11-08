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
import { MediaAssetEntity } from 'src/modules/media/entities';
import { S3Service } from 'src/modules/media/s3.service';
import { ServiceEntity } from 'src/modules/service/entities';

describe('Service (e2e)', () => {
  let app: INestApplication;
  let serviceRepository: Repository<ServiceEntity>;
  let mediaAssetRepository: Repository<MediaAssetEntity>;
  let cleaningComponentRepository: Repository<CleaningComponentEntity>;
  let adminRepository: Repository<AdminEntity>;
  let adminToken: string;
  const mediaAssetIds: number[] = [];
  const serviceIds: number[] = [];
  const componentIds: number[] = [];

  const adminEmail = 'e2e-service-admin@jeenj.com';
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

    serviceRepository = moduleFixture.get(getRepositoryToken(ServiceEntity));
    mediaAssetRepository = moduleFixture.get(
      getRepositoryToken(MediaAssetEntity),
    );
    cleaningComponentRepository = moduleFixture.get(
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
    await serviceRepository.delete({
      id: In(serviceIds.length ? serviceIds : [-1]),
    });
    await cleaningComponentRepository.delete({
      id: In(componentIds.length ? componentIds : [-1]),
    });
    await mediaAssetRepository.delete({
      id: In(mediaAssetIds.length ? mediaAssetIds : [-1]),
    });
    await app.close();
  });

  const createService = async (
    body: Record<string, unknown> = {},
  ): Promise<{
    id: number;
    mediaAssetId: number;
    cleaningComponents: { id: number }[];
  }> => {
    const response = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: { en: `Window Cleaning ${Date.now()}-${Math.random()}` },
        description: { en: 'Interior windows' },
        key: 'service-image/e2e-test.webp',
        purpose: 'service-image',
        ...body,
      })
      .expect(201);

    serviceIds.push(response.body.data.id as number);
    mediaAssetIds.push(response.body.data.mediaAssetId as number);
    return response.body.data as {
      id: number;
      mediaAssetId: number;
      cleaningComponents: { id: number }[];
    };
  };

  const createComponent = async (title: string): Promise<number> => {
    const response = await request(app.getHttpServer())
      .post('/cleaning-components')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: { en: title } })
      .expect(201);

    const id = response.body.data.id as number;
    componentIds.push(id);
    return id;
  };

  describe('POST /services (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .post('/services')
        .send({
          title: { en: 'Window Cleaning' },
          description: { en: 'Interior windows' },
          key: 'service-image/abc.webp',
          purpose: 'service-image',
        })
        .expect(401);
    });

    it('rejects a key given without a purpose', async () => {
      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { en: 'Window Cleaning' },
          description: { en: 'Interior windows' },
          key: 'service-image/abc.webp',
        })
        .expect(400);
    });

    it('creates a service for an authenticated admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { en: 'Window Cleaning' },
          description: { en: 'Interior windows' },
          key: 'service-image/abc.webp',
          purpose: 'service-image',
        })
        .expect(201);

      expect(response.body.data).toMatchObject({
        title: { en: 'Window Cleaning' },
        description: { en: 'Interior windows' },
        isActive: true,
        order: 0,
      });
      expect(response.body.data.mediaAssetId).toBeDefined();
      serviceIds.push(response.body.data.id as number);
      mediaAssetIds.push(response.body.data.mediaAssetId as number);
    });

    it('attaches existing cleaning components by id', async () => {
      const dustRemovalId = await createComponent(`Dust removal ${Date.now()}`);
      const windowCleaningId = await createComponent(
        `Window cleaning ${Date.now()}`,
      );

      const response = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { en: `Deep Cleaning ${Date.now()}` },
          description: { en: 'Full apartment deep clean' },
          key: 'service-image/deep-cleaning.webp',
          purpose: 'service-image',
          componentIds: [dustRemovalId, windowCleaningId],
        })
        .expect(201);

      serviceIds.push(response.body.data.id as number);
      mediaAssetIds.push(response.body.data.mediaAssetId as number);

      const components = response.body.data.cleaningComponents as {
        id: number;
      }[];
      expect(components.map((component) => component.id).sort()).toEqual(
        [dustRemovalId, windowCleaningId].sort(),
      );
    });

    it('rejects a non-existent component id', async () => {
      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { en: 'Invalid Component Service' },
          description: { en: 'Should fail' },
          key: 'service-image/invalid.webp',
          purpose: 'service-image',
          componentIds: [999999],
        })
        .expect(400);
    });

    it('rejects a duplicate service title', async () => {
      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { en: 'Window Cleaning' },
          description: { en: 'Interior windows' },
          key: 'service-image/def.webp',
          purpose: 'service-image',
        })
        .expect(409);
    });

    it('rejects a missing required field', async () => {
      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: { en: 'No Description Service' } })
        .expect(400);
    });
  });

  describe('GET /services/active (public)', () => {
    let activeServiceId: number;

    it('requires no auth and only returns active services with resolved media and components', async () => {
      const dustRemovalId = await createComponent(
        `Active Dust removal ${Date.now()}`,
      );
      await request(app.getHttpServer())
        .patch(`/cleaning-components/${dustRemovalId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: { hy: 'Փոշու մաքրում' } })
        .expect(200);
      const active = await createService({
        title: {
          en: 'Active Showcase Service',
          hy: 'Ակտիվ ցուցադրական ծառայություն',
        },
        key: 'service-video/e2e-active.mp4',
        purpose: 'service-video',
        componentIds: [dustRemovalId],
      });
      const disabled = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { en: 'Disabled Service' },
          description: { en: 'Should not appear' },
          key: 'service-image/disabled.webp',
          purpose: 'service-image',
        })
        .expect(201);
      serviceIds.push(disabled.body.data.id as number);
      mediaAssetIds.push(disabled.body.data.mediaAssetId as number);

      await request(app.getHttpServer())
        .patch(`/services/${disabled.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/services/active')
        .expect(200);

      const found = (
        response.body.data as {
          id: number;
          media: { url: string };
          components: { id: number }[];
        }[]
      ).find((service) => service.id === active.id);

      expect(found).toBeDefined();
      expect(found?.media.url).toBe('https://media-url');
      expect(found?.components.map((component) => component.id)).toEqual([
        dustRemovalId,
      ]);
      expect(
        (response.body.data as { id: number }[]).some(
          (service) => service.id === disabled.body.data.id,
        ),
      ).toBe(false);
      activeServiceId = active.id;
    });

    type LocalizedService = {
      id: number;
      title: string;
      description: string;
      components: { title: string }[];
    };

    const findActiveService = async (
      language?: string,
    ): Promise<LocalizedService | undefined> => {
      const call = request(app.getHttpServer()).get('/services/active');
      const response = await (
        language ? call.set('language', language) : call
      ).expect(200);

      return (response.body.data as LocalizedService[]).find(
        (service) => service.id === activeServiceId,
      );
    };

    it('returns English strings by default', async () => {
      const found = await findActiveService();

      expect(found?.title).toBe('Active Showcase Service');
      expect(found?.description).toBe('Interior windows');
      expect(found?.components[0].title).toMatch(/^Active Dust removal/);
    });

    it('returns the language given in the language header', async () => {
      const found = await findActiveService('hy');

      expect(found?.title).toBe('Ակտիվ ցուցադրական ծառայություն');
      expect(found?.components[0].title).toBe('Փոշու մաքրում');
    });

    it('falls back to English for an untranslated language', async () => {
      const found = await findActiveService('ru');

      expect(found?.title).toBe('Active Showcase Service');
      expect(found?.description).toBe('Interior windows');
    });
  });

  describe('GET /services and /services/:id (admin-guarded)', () => {
    let serviceId: number;

    beforeAll(async () => {
      const created = await createService({
        title: { en: 'List Target Service' },
      });
      serviceId = created.id;
    });

    it('GET /services rejects requests without a token', async () => {
      await request(app.getHttpServer()).get('/services').expect(401);
    });

    it('GET /services returns all services for an authenticated admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(
        response.body.data.some(
          (service: { id: number }) => service.id === serviceId,
        ),
      ).toBe(true);
    });

    it('GET /services/:id rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .get(`/services/${serviceId}`)
        .expect(401);
    });

    it('GET /services/:id returns the service for an authenticated admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(serviceId);
    });

    it('GET /services/:id returns 404 for a non-existent service', async () => {
      await request(app.getHttpServer())
        .get('/services/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /services/:id (admin-guarded)', () => {
    let serviceId: number;

    beforeAll(async () => {
      const created = await createService({
        title: { en: 'Patch Target Service' },
      });
      serviceId = created.id;
    });

    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .patch(`/services/${serviceId}`)
        .send({ isActive: false })
        .expect(401);
    });

    it('rejects a key given without a purpose', async () => {
      await request(app.getHttpServer())
        .patch(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ key: 'service-image/new.webp' })
        .expect(400);
    });

    it('disables a service', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.data.isActive).toBe(false);
    });

    it('re-enables a service and updates its title/description/order', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: true,
          title: { en: 'Renamed Service', hy: 'Վերանվանված ծառայություն' },
          description: { en: 'Updated description' },
          order: 5,
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        isActive: true,
        title: { en: 'Renamed Service', hy: 'Վերանվանված ծառայություն' },
        description: { en: 'Updated description' },
        order: 5,
      });
    });

    it('updates one translation without touching the others', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: { ru: 'Переименованная услуга' } })
        .expect(200);

      expect(response.body.data.title).toEqual({
        en: 'Renamed Service',
        hy: 'Վերանվանված ծառայություն',
        ru: 'Переименованная услуга',
      });
    });

    it('rejects renaming to an English title another service uses', async () => {
      const other = await createService();
      const otherTitle = (
        await request(app.getHttpServer())
          .get(`/services/${other.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
      ).body.data.title.en as string;

      await request(app.getHttpServer())
        .patch(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: { en: otherTitle } })
        .expect(409);
    });

    it('replaces the media when key and purpose are given together', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ key: 'service-video/new.mp4', purpose: 'service-video' })
        .expect(200);

      expect(response.body.data.mediaAssetId).toBeDefined();
      mediaAssetIds.push(response.body.data.mediaAssetId as number);
    });

    it('replaces the cleaning components when componentIds is given', async () => {
      const componentId = await createComponent(
        `Patch component ${Date.now()}`,
      );

      const response = await request(app.getHttpServer())
        .patch(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ componentIds: [componentId] })
        .expect(200);

      expect(
        (response.body.data.cleaningComponents as { id: number }[]).map(
          (component) => component.id,
        ),
      ).toEqual([componentId]);
    });

    it('clears the cleaning components when componentIds is empty', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ componentIds: [] })
        .expect(200);

      expect(response.body.data.cleaningComponents).toEqual([]);
    });

    it('returns 404 for a non-existent service', async () => {
      await request(app.getHttpServer())
        .patch('/services/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(404);
    });
  });
});
