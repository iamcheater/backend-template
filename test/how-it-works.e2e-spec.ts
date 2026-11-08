import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { In, Repository } from 'typeorm';
import { AppModule } from 'src/app.module';
import { AdminEntity } from 'src/modules/admin/entities';
import { AdminRole } from 'src/modules/admin/enums';
import {
  HowItWorksSectionEntity,
  HowItWorksStepEntity,
} from 'src/modules/how-it-works/entities';
import { HowItWorksSectionService } from 'src/modules/how-it-works/how-it-works-section.service';
import { MediaAssetEntity } from 'src/modules/media/entities';
import { S3Service } from 'src/modules/media/s3.service';

describe('HowItWorks (e2e)', () => {
  let app: INestApplication;
  let sectionRepository: Repository<HowItWorksSectionEntity>;
  let stepRepository: Repository<HowItWorksStepEntity>;
  let mediaAssetRepository: Repository<MediaAssetEntity>;
  let adminRepository: Repository<AdminEntity>;
  let adminToken: string;
  let originalSectionState: {
    id: number;
    mediaAssetId: number | null;
  };
  const mediaAssetIds: number[] = [];
  const stepIds: number[] = [];
  let signUpStepId: number;
  let pickPlanStepId: number;

  const adminEmail = 'e2e-how-it-works-admin@jeenj.com';
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

    sectionRepository = moduleFixture.get(
      getRepositoryToken(HowItWorksSectionEntity),
    );
    stepRepository = moduleFixture.get(
      getRepositoryToken(HowItWorksStepEntity),
    );
    mediaAssetRepository = moduleFixture.get(
      getRepositoryToken(MediaAssetEntity),
    );
    adminRepository = moduleFixture.get(getRepositoryToken(AdminEntity));

    await moduleFixture.get(HowItWorksSectionService).ensureSeeded();

    const [section] = await sectionRepository.find({ take: 1 });
    originalSectionState = {
      id: section.id,
      mediaAssetId: section.mediaAssetId,
    };

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
    await sectionRepository.update(originalSectionState.id, {
      mediaAssetId: originalSectionState.mediaAssetId,
    });
    await stepRepository.delete({
      id: In(stepIds.length ? stepIds : [-1]),
    });
    await mediaAssetRepository.delete({
      id: In(mediaAssetIds.length ? mediaAssetIds : [-1]),
    });
    await adminRepository.delete({ email: adminEmail });
    await app.close();
  });

  describe('GET /how-it-works (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer()).get('/how-it-works').expect(401);
    });

    it('returns the singleton section, even with nothing configured yet', async () => {
      const response = await request(app.getHttpServer())
        .get('/how-it-works')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.id).toBeDefined();
    });
  });

  describe('PATCH /how-it-works (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .patch('/how-it-works')
        .send({ key: 'how-it-works-video/new.mp4' })
        .expect(401);
    });

    it('rejects a key given without a purpose', async () => {
      await request(app.getHttpServer())
        .patch('/how-it-works')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ key: 'how-it-works-video/new.mp4' })
        .expect(400);
    });

    it('sets the media when key and purpose are given together', async () => {
      const response = await request(app.getHttpServer())
        .patch('/how-it-works')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: 'how-it-works-video/e2e-test.mp4',
          purpose: 'how-it-works-video',
        })
        .expect(200);

      expect(response.body.data.mediaAssetId).toBeDefined();
      mediaAssetIds.push(response.body.data.mediaAssetId as number);
    });
  });

  describe('POST /how-it-works/steps (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .post('/how-it-works/steps')
        .send({
          title: { en: 'Sign up' },
          description: { en: 'Create an account' },
        })
        .expect(401);
    });

    it('adds a new step, even with nothing in the list yet', async () => {
      const response = await request(app.getHttpServer())
        .post('/how-it-works/steps')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { en: 'Sign up', hy: 'Գրանցվել' },
          description: { en: 'Create an account', hy: 'Ստեղծեք հաշիվ' },
          order: 0,
        })
        .expect(201);

      expect(response.body.data.title).toEqual({
        en: 'Sign up',
        hy: 'Գրանցվել',
      });
      expect(response.body.data.description).toEqual({
        en: 'Create an account',
        hy: 'Ստեղծեք հաշիվ',
      });
      signUpStepId = response.body.data.id as number;
      stepIds.push(signUpStepId);
    });

    it('rejects a title without an English translation', async () => {
      await request(app.getHttpServer())
        .post('/how-it-works/steps')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { hy: 'Գրանցվել' },
          description: { en: 'Create an account' },
        })
        .expect(400);
    });

    it('rejects a plain string title', async () => {
      await request(app.getHttpServer())
        .post('/how-it-works/steps')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Sign up', description: { en: 'Create an account' } })
        .expect(400);
    });

    it('rejects a key given without a purpose', async () => {
      await request(app.getHttpServer())
        .post('/how-it-works/steps')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { en: 'Sign up' },
          description: { en: 'Create an account' },
          key: 'how-it-works-image/abc.webp',
        })
        .expect(400);
    });

    it('creates a step with media when key and purpose are given together', async () => {
      const response = await request(app.getHttpServer())
        .post('/how-it-works/steps')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { en: 'Pick a plan' },
          description: { en: 'Choose the plan that fits' },
          key: 'how-it-works-video/step-media.mp4',
          purpose: 'how-it-works-video',
        })
        .expect(201);

      expect(response.body.data.mediaAssetId).toBeDefined();
      pickPlanStepId = response.body.data.id as number;
      stepIds.push(pickPlanStepId);
      mediaAssetIds.push(response.body.data.mediaAssetId as number);
    });
  });

  describe('GET /how-it-works/steps (admin-guarded)', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer()).get('/how-it-works/steps').expect(401);
    });

    it('returns all steps', async () => {
      const response = await request(app.getHttpServer())
        .get('/how-it-works/steps')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(
        (response.body.data as HowItWorksStepEntity[]).some((step) =>
          stepIds.includes(step.id),
        ),
      ).toBe(true);
    });
  });

  describe('PATCH /how-it-works/steps/:id (admin-guarded)', () => {
    it('merges the given translations into the stored ones', async () => {
      const created = await request(app.getHttpServer())
        .post('/how-it-works/steps')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { en: 'Choose a plan', hy: 'Ընտրեք փաթեթ' },
          description: { en: 'Pick a plan', ru: 'Выберите план' },
          order: 1,
        })
        .expect(201);
      stepIds.push(created.body.data.id as number);

      const response = await request(app.getHttpServer())
        .patch(`/how-it-works/steps/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: { en: 'Choose your plan' }, description: { ru: '' } })
        .expect(200);

      expect(response.body.data.title).toEqual({
        en: 'Choose your plan',
        hy: 'Ընտրեք փաթեթ',
      });
      expect(response.body.data.description).toEqual({ en: 'Pick a plan' });
    });

    it('rejects clearing the English title', async () => {
      await request(app.getHttpServer())
        .patch(`/how-it-works/steps/${signUpStepId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: { en: '' } })
        .expect(400);
    });
  });

  describe('DELETE /how-it-works/steps/:id (admin-guarded)', () => {
    it('removes the step', async () => {
      const created = await request(app.getHttpServer())
        .post('/how-it-works/steps')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: { en: 'Get started' },
          description: { en: 'Start using the app' },
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/how-it-works/steps/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/how-it-works/steps')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(
        (response.body.data as HowItWorksStepEntity[]).some(
          (step) => step.id === created.body.data.id,
        ),
      ).toBe(false);
    });
  });

  describe('GET /how-it-works/active (public)', () => {
    it('requires no token', async () => {
      await request(app.getHttpServer())
        .get('/how-it-works/active')
        .expect(200);
    });

    type PublicStep = {
      id: number;
      title: string;
      description: string;
      media: { url: string } | null;
    };

    it('returns resolved media and ordered steps in English by default', async () => {
      const response = await request(app.getHttpServer())
        .get('/how-it-works/active')
        .expect(200);

      expect(response.body.data.media.url).toBe('https://media-url');

      const steps = response.body.data.steps as PublicStep[];

      const signUpStep = steps.find((step) => step.id === signUpStepId);
      expect(signUpStep?.title).toBe('Sign up');
      expect(signUpStep?.description).toBe('Create an account');

      const stepWithMedia = steps.find((step) => step.id === pickPlanStepId);
      expect(stepWithMedia?.title).toBe('Pick a plan');
      expect(stepWithMedia?.media?.url).toBe('https://media-url');
    });

    it('returns step text in the language from the language header', async () => {
      const response = await request(app.getHttpServer())
        .get('/how-it-works/active')
        .set('language', 'hy')
        .expect(200);

      const steps = response.body.data.steps as PublicStep[];

      const signUpStep = steps.find((step) => step.id === signUpStepId);
      expect(signUpStep?.title).toBe('Գրանցվել');
      expect(signUpStep?.description).toBe('Ստեղծեք հաշիվ');

      const untranslatedStep = steps.find((step) => step.id === pickPlanStepId);
      expect(untranslatedStep?.title).toBe('Pick a plan');
    });

    it('falls back to English for a language with no translation', async () => {
      const response = await request(app.getHttpServer())
        .get('/how-it-works/active')
        .set('language', 'ru')
        .expect(200);

      const steps = response.body.data.steps as PublicStep[];

      const signUpStep = steps.find((step) => step.id === signUpStepId);
      expect(signUpStep?.title).toBe('Sign up');
      expect(signUpStep?.description).toBe('Create an account');
    });
  });
});
