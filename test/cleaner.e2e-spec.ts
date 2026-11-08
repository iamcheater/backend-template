import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { Like, Repository } from 'typeorm';
import { AppModule } from 'src/app.module';
import { AdminEntity } from 'src/modules/admin/entities';
import { AdminRole } from 'src/modules/admin/enums';
import { CleanerEntity } from 'src/modules/cleaner/entities';
import {
  Availability,
  CleanerSkill,
  CleanerStatus,
  CleaningExperience,
} from 'src/modules/cleaner/enums';
import { S3Service } from 'src/modules/media/s3.service';
import { TelegramService } from 'src/modules/telegram/telegram.service';
import { UserEntity } from 'src/modules/users/entities';

describe('Cleaner (e2e)', () => {
  let app: INestApplication;
  let cleanerRepository: Repository<CleanerEntity>;
  let adminRepository: Repository<AdminEntity>;
  let userRepository: Repository<UserEntity>;
  let sendMessage: jest.Mock;

  const NAME_PREFIX = 'E2E Cleaner';

  const validPayload = () => ({
    fullName: `${NAME_PREFIX} Jane`,
    phone: '+374 55 123456',
    cityArea: 'Arabkir, Yerevan',
    cleaningExperience: 'oneToThree',
    availability: ['weekdayMornings', 'weekends'],
    servicesCanDo: ['home', 'windows'],
    hasOwnSupplies: 'yes',
    message: 'Available immediately.',
    consentAccepted: true,
    language: 'ru',
    sourcePage: 'for-cleaners',
    pageUrl: 'https://jeenj.am/ru/for-cleaners',
    website: '',
  });

  const createStoredCleaner = (fullName: string, status?: CleanerStatus) =>
    cleanerRepository.save(
      cleanerRepository.create({
        fullName,
        phone: '055123456',
        cityArea: 'Some area',
        cleaningExperience: CleaningExperience.ONE_TO_THREE,
        availability: [Availability.WEEKENDS],
        servicesCanDo: [CleanerSkill.HOME],
        hasOwnSupplies: false,
        consentAccepted: true,
        language: null,
        sourcePage: 'for-cleaners',
        status,
      }),
    );

  beforeAll(async () => {
    sendMessage = jest.fn().mockResolvedValue(undefined);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TelegramService)
      .useValue({ sendMessage })
      .overrideProvider(S3Service)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    cleanerRepository = moduleFixture.get(getRepositoryToken(CleanerEntity));
    adminRepository = moduleFixture.get(getRepositoryToken(AdminEntity));
    userRepository = moduleFixture.get(getRepositoryToken(UserEntity));
  });

  beforeEach(() => {
    sendMessage.mockClear();
  });

  afterEach(async () => {
    await cleanerRepository.delete({ fullName: Like(`${NAME_PREFIX}%`) });
  });

  afterAll(async () => {
    await app.close();
  });

  const findSaved = (fullName: string) =>
    cleanerRepository.findOneBy({ fullName });

  it('POST /cleaner-application requires no auth, stores the website form as sent, and notifies Telegram', async () => {
    const payload = validPayload();
    const response = await request(app.getHttpServer())
      .post('/cleaner-application')
      .send(payload)
      .expect(201);

    expect(response.body).toEqual({ success: true });

    const saved = await findSaved(payload.fullName);
    expect(saved).toMatchObject({
      fullName: payload.fullName,
      phone: payload.phone,
      cityArea: payload.cityArea,
      cleaningExperience: 'oneToThree',
      availability: ['weekdayMornings', 'weekends'],
      servicesCanDo: ['home', 'windows'],
      hasOwnSupplies: true,
      message: payload.message,
      status: CleanerStatus.PENDING,
      consentAccepted: true,
      language: 'ru',
      sourcePage: 'for-cleaners',
      pageUrl: payload.pageUrl,
    });
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('POST /cleaner-application stores "no" supplies as false and empty optional fields as null', async () => {
    const payload = {
      ...validPayload(),
      fullName: `${NAME_PREFIX} Minimal`,
      hasOwnSupplies: 'no',
      message: '',
      pageUrl: '',
    };
    await request(app.getHttpServer())
      .post('/cleaner-application')
      .send(payload)
      .expect(201);

    expect(await findSaved(payload.fullName)).toMatchObject({
      hasOwnSupplies: false,
      message: null,
      pageUrl: null,
    });
  });

  it('POST /cleaner-application keeps status pending even if the client tries to set it', async () => {
    const payload = {
      ...validPayload(),
      fullName: `${NAME_PREFIX} Sneaky`,
      status: CleanerStatus.VERIFIED,
    };
    await request(app.getHttpServer())
      .post('/cleaner-application')
      .send(payload)
      .expect(201);

    expect((await findSaved(payload.fullName))?.status).toBe(
      CleanerStatus.PENDING,
    );
  });

  it('POST /cleaner-application pretends to succeed but saves nothing when the honeypot is filled', async () => {
    const payload = {
      ...validPayload(),
      fullName: `${NAME_PREFIX} Bot`,
      website: 'https://spam.example',
    };
    const response = await request(app.getHttpServer())
      .post('/cleaner-application')
      .send(payload)
      .expect(201);

    expect(response.body).toEqual({ success: true });
    expect(await findSaved(payload.fullName)).toBeNull();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it.each([
    ['consent not accepted', { consentAccepted: false }],
    ['blank full name', { fullName: '  ' }],
    ['missing city/area', { cityArea: '' }],
    ['invalid phone', { phone: '123' }],
    ['missing experience', { cleaningExperience: '' }],
    ['unknown experience', { cleaningExperience: 'tenYears' }],
    ['empty availability', { availability: [] }],
    ['unknown availability slot', { availability: ['nights'] }],
    ['availability sent as a string', { availability: 'weekends' }],
    [
      'duplicate availability slots',
      { availability: ['weekends', 'weekends'] },
    ],
    ['empty services', { servicesCanDo: [] }],
    ['unknown service', { servicesCanDo: ['gardening'] }],
    ['missing supplies answer', { hasOwnSupplies: '' }],
    ['supplies answer sent as a boolean', { hasOwnSupplies: true }],
    ['unsupported language', { language: 'de' }],
  ])(
    'POST /cleaner-application rejects %s with 400',
    async (_case, override) => {
      await request(app.getHttpServer())
        .post('/cleaner-application')
        .send({ ...validPayload(), ...override })
        .expect(400);

      expect(sendMessage).not.toHaveBeenCalled();
    },
  );

  it('POST /cleaner is no longer a public submission route', async () => {
    await request(app.getHttpServer())
      .post('/cleaner')
      .send(validPayload())
      .expect(404);
  });

  describe('PATCH /cleaner/:id (admin-guarded status update)', () => {
    const adminEmail = 'e2e-cleaner-admin@jeenj.com';
    const adminPassword = 'AdminPass123!';
    const regularUserEmail = 'e2e-cleaner-regular-user@jeenj.com';
    let adminToken: string;
    let cleanerId: number;

    beforeAll(async () => {
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

      cleanerId = (await createStoredCleaner('Status Target')).id;
    });

    afterAll(async () => {
      await adminRepository.delete({ email: adminEmail });
      await userRepository.delete({ email: regularUserEmail });
      await cleanerRepository.delete({ fullName: 'Status Target' });
    });

    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .patch(`/cleaner/${cleanerId}`)
        .send({ status: CleanerStatus.VERIFIED })
        .expect(401);
    });

    it('rejects a regular user token (no cross-domain token reuse)', async () => {
      await userRepository.save(
        userRepository.create({
          email: regularUserEmail,
          password: await bcrypt.hash('UserPass123!', 10),
        }),
      );
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: regularUserEmail, password: 'UserPass123!' });
      const { accessToken } = loginResponse.body.data;

      await request(app.getHttpServer())
        .patch(`/cleaner/${cleanerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: CleanerStatus.VERIFIED })
        .expect(401);
    });

    it('rejects an invalid status value', async () => {
      await request(app.getHttpServer())
        .patch(`/cleaner/${cleanerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'not-a-real-status' })
        .expect(400);
    });

    it('lets an authenticated admin update the status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/cleaner/${cleanerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: CleanerStatus.VERIFIED })
        .expect(200);

      expect(response.body.data.status).toBe(CleanerStatus.VERIFIED);
    });

    it('returns 404 for a non-existent cleaner', async () => {
      await request(app.getHttpServer())
        .patch('/cleaner/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: CleanerStatus.REJECTED })
        .expect(404);
    });
  });

  describe('GET /cleaner and /cleaner/:id (admin-guarded)', () => {
    const adminEmail = 'e2e-cleaner-list-admin@jeenj.com';
    const adminPassword = 'AdminPass123!';
    let adminToken: string;
    let cleanerId: number;

    beforeAll(async () => {
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

      cleanerId = (await createStoredCleaner('List Target')).id;
    });

    afterAll(async () => {
      await adminRepository.delete({ email: adminEmail });
      await cleanerRepository.delete({ fullName: 'List Target' });
    });

    it('GET /cleaner rejects requests without a token', async () => {
      await request(app.getHttpServer()).get('/cleaner').expect(401);
    });

    it('GET /cleaner returns a paginated page for an authenticated admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/cleaner')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data.data)).toBe(true);
      expect(response.body.data.meta).toMatchObject({ page: 1, take: 10 });
      expect(
        response.body.data.data.some(
          (cleaner: { id: number }) => cleaner.id === cleanerId,
        ),
      ).toBe(true);
    });

    it('GET /cleaner honors page and take query params', async () => {
      const response = await request(app.getHttpServer())
        .get('/cleaner')
        .query({ page: 1, take: 1 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.meta).toMatchObject({ page: 1, take: 1 });
    });

    it('GET /cleaner/:id rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .get(`/cleaner/${cleanerId}`)
        .expect(401);
    });

    it('GET /cleaner/:id returns the cleaner for an authenticated admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cleaner/${cleanerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(cleanerId);
    });

    it('GET /cleaner/:id returns 404 for a non-existent cleaner', async () => {
      await request(app.getHttpServer())
        .get('/cleaner/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
  describe('GET /cleaner search and filters', () => {
    const adminEmail = 'e2e-cleaner-filter-admin@jeenj.com';
    const adminPassword = 'AdminPass123!';
    let adminToken: string;
    let pendingId: number;
    let verifiedId: number;

    const list = (query: Record<string, string | number | boolean>) =>
      request(app.getHttpServer())
        .get('/cleaner')
        .query({ take: 100, ...query })
        .set('Authorization', `Bearer ${adminToken}`);

    const idsOf = (response: request.Response): number[] =>
      (response.body.data.data as { id: number }[]).map(
        (cleaner) => cleaner.id,
      );

    beforeAll(async () => {
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

      const [pending, verified] = await cleanerRepository.save([
        cleanerRepository.create({
          fullName: 'Filter Quillon Pending',
          phone: '+374 91 445566',
          cityArea: 'Filtertown Nor Nork',
          cleaningExperience: CleaningExperience.NONE,
          availability: [Availability.EVENINGS],
          servicesCanDo: [CleanerSkill.WINDOWS],
          hasOwnSupplies: true,
          consentAccepted: true,
          language: null,
          sourcePage: 'for-cleaners',
        }),
        cleanerRepository.create({
          fullName: 'Filter Quillon Verified',
          phone: '+374 91 778899',
          cityArea: 'Filtertown Ajapnyak',
          cleaningExperience: CleaningExperience.THREE_PLUS,
          availability: [Availability.WEEKENDS, Availability.FULL_TIME],
          servicesCanDo: [CleanerSkill.HOME, CleanerSkill.DEEP],
          hasOwnSupplies: false,
          consentAccepted: true,
          language: null,
          sourcePage: 'for-cleaners',
          status: CleanerStatus.VERIFIED,
        }),
      ]);
      pendingId = pending.id;
      verifiedId = verified.id;
    });

    afterAll(async () => {
      await adminRepository.delete({ email: adminEmail });
      await cleanerRepository.delete({ fullName: Like('Filter Quillon%') });
    });

    it('matches the search text against name, area and phone digits', async () => {
      const byName = await list({ search: 'quillon' }).expect(200);
      expect(idsOf(byName)).toEqual(
        expect.arrayContaining([pendingId, verifiedId]),
      );

      const byArea = await list({ search: 'Nor Nork' }).expect(200);
      expect(idsOf(byArea)).toEqual([pendingId]);

      const byPhone = await list({ search: '091778899' }).expect(200);
      expect(idsOf(byPhone)).toEqual([verifiedId]);
    });

    it('treats "#<id>" as an exact id lookup', async () => {
      const response = await list({ search: `#${verifiedId}` }).expect(200);
      expect(idsOf(response)).toEqual([verifiedId]);
    });

    it('filters by status and experience', async () => {
      const response = await list({
        search: 'Quillon',
        status: CleanerStatus.VERIFIED,
        cleaningExperience: CleaningExperience.THREE_PLUS,
      }).expect(200);
      expect(idsOf(response)).toEqual([verifiedId]);
    });

    it('filters by a skill or availability slot contained in the lists', async () => {
      const bySkill = await list({
        search: 'Quillon',
        skill: CleanerSkill.DEEP,
      }).expect(200);
      expect(idsOf(bySkill)).toEqual([verifiedId]);

      const byAvailability = await list({
        search: 'Quillon',
        availability: Availability.EVENINGS,
      }).expect(200);
      expect(idsOf(byAvailability)).toEqual([pendingId]);
    });

    it('filters by own supplies, parsing the query string as a boolean', async () => {
      const withSupplies = await list({
        search: 'Quillon',
        hasOwnSupplies: 'true',
      }).expect(200);
      expect(idsOf(withSupplies)).toEqual([pendingId]);

      const withoutSupplies = await list({
        search: 'Quillon',
        hasOwnSupplies: 'false',
      }).expect(200);
      expect(idsOf(withoutSupplies)).toEqual([verifiedId]);
    });

    it('rejects unknown filter values', async () => {
      await list({ status: 'archived' }).expect(400);
      await list({ hasOwnSupplies: 'maybe' }).expect(400);
    });
  });
});
