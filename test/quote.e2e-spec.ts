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
import { QuoteEntity } from 'src/modules/quote/entities';
import { KindOfClean, QuoteAssignment } from 'src/modules/quote/enums';
import { SubmissionLanguage } from 'src/common/enums';
import { TelegramService } from 'src/modules/telegram/telegram.service';

describe('Quote (e2e)', () => {
  let app: INestApplication;
  let quoteRepository: Repository<QuoteEntity>;
  let adminRepository: Repository<AdminEntity>;
  let cleanerRepository: Repository<CleanerEntity>;
  let sendMessage: jest.Mock;

  const NAME_PREFIX = 'E2E Quote';

  const validPayload = () => ({
    kindOfClean: 'home',
    name: `${NAME_PREFIX} Jane`,
    phone: '+374 55 123456',
    area: 'Arabkir, Yerevan',
    preferredTiming: 'thisWeek',
    message: 'Please call before arriving.',
    consentAccepted: true,
    language: 'hy',
    sourcePage: 'contact',
    pageUrl: 'https://jeenj.am/hy/contact',
    website: '',
  });

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

    quoteRepository = moduleFixture.get(getRepositoryToken(QuoteEntity));
    adminRepository = moduleFixture.get(getRepositoryToken(AdminEntity));
    cleanerRepository = moduleFixture.get(getRepositoryToken(CleanerEntity));
  });

  beforeEach(() => {
    sendMessage.mockClear();
  });

  afterEach(async () => {
    await quoteRepository.delete({ name: Like(`${NAME_PREFIX}%`) });
  });

  afterAll(async () => {
    await app.close();
  });

  const findSaved = (name: string) => quoteRepository.findOneBy({ name });

  it('POST /quote requires no auth, stores the website form as sent, and notifies Telegram', async () => {
    const payload = validPayload();
    const response = await request(app.getHttpServer())
      .post('/quote')
      .send(payload)
      .expect(201);

    expect(response.body).toEqual({ success: true });

    const saved = await findSaved(payload.name);
    expect(saved).toMatchObject({
      kindOfClean: 'home',
      name: payload.name,
      phone: payload.phone,
      area: payload.area,
      preferredTiming: 'thisWeek',
      message: payload.message,
      consentAccepted: true,
      language: 'hy',
      sourcePage: 'contact',
      pageUrl: payload.pageUrl,
    });
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('POST /quote stores empty optional fields (timing, message, pageUrl) as null', async () => {
    const payload = {
      ...validPayload(),
      name: `${NAME_PREFIX} Blank`,
      preferredTiming: '',
      message: '   ',
      pageUrl: '',
    };
    await request(app.getHttpServer()).post('/quote').send(payload).expect(201);

    const saved = await findSaved(payload.name);
    expect(saved).toMatchObject({
      preferredTiming: null,
      message: null,
      pageUrl: null,
    });
  });

  it('POST /quote trims text fields', async () => {
    await request(app.getHttpServer())
      .post('/quote')
      .send({
        ...validPayload(),
        name: `  ${NAME_PREFIX} Trimmed  `,
        area: '  Kentron  ',
      })
      .expect(201);

    const saved = await findSaved(`${NAME_PREFIX} Trimmed`);
    expect(saved?.area).toBe('Kentron');
  });

  it('POST /quote pretends to succeed but saves nothing when the honeypot is filled', async () => {
    const payload = {
      ...validPayload(),
      name: `${NAME_PREFIX} Bot`,
      website: 'https://spam.example',
    };
    const response = await request(app.getHttpServer())
      .post('/quote')
      .send(payload)
      .expect(201);

    expect(response.body).toEqual({ success: true });
    expect(await findSaved(payload.name)).toBeNull();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('POST /quote accepts a real foreign number given with its country code', async () => {
    const payload = {
      ...validPayload(),
      name: `${NAME_PREFIX} Foreign`,
      phone: '+14155552671',
    };
    await request(app.getHttpServer()).post('/quote').send(payload).expect(201);

    expect((await findSaved(payload.name))?.phone).toBe('+14155552671');
  });

  it.each([
    ['consent not accepted', { consentAccepted: false }],
    ['consent missing', { consentAccepted: undefined }],
    ['unknown kind of clean', { kindOfClean: 'garden' }],
    ['missing kind of clean', { kindOfClean: '' }],
    ['blank name', { name: '   ' }],
    ['missing area', { area: '' }],
    ['invalid phone', { phone: '123' }],
    ['digits that are not a real phone number', { phone: '123456' }],
    ['unknown preferred timing', { preferredTiming: 'tomorrow' }],
    ['unsupported language', { language: 'de' }],
    ['missing source page', { sourcePage: '' }],
    ['page URL over 300 characters', { pageUrl: `https://${'a'.repeat(300)}` }],
  ])('POST /quote rejects %s with 400', async (_case, override) => {
    await request(app.getHttpServer())
      .post('/quote')
      .send({ ...validPayload(), ...override })
      .expect(400);

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('POST /quote returns one message plus translated field errors', async () => {
    const response = await request(app.getHttpServer())
      .post('/quote')
      .set('language', 'ru')
      .send({ ...validPayload(), phone: '123' })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 400,
      message:
        'Некоторые поля заполнены неверно. Проверьте их и попробуйте снова.',
      errors: [
        {
          field: 'phone',
          message:
            'Введите корректный номер телефона. Армянские номера можно вводить как есть, для других стран нужен код страны, например +1.',
        },
      ],
    });
  });

  const createStoredQuote = (name: string) =>
    quoteRepository.save(
      quoteRepository.create({
        kindOfClean: null,
        name,
        phone: '055123456',
        area: 'Some area',
        consentAccepted: true,
        language: null,
        sourcePage: 'contact',
      }),
    );

  describe('GET /quote and /quote/:id (admin-guarded)', () => {
    const adminEmail = 'e2e-quote-list-admin@jeenj.com';
    const adminPassword = 'AdminPass123!';
    let adminToken: string;
    let quoteId: number;

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

      quoteId = (await createStoredQuote('List Target')).id;
    });

    afterAll(async () => {
      await adminRepository.delete({ email: adminEmail });
      await quoteRepository.delete({ name: 'List Target' });
    });

    it('GET /quote rejects requests without a token', async () => {
      await request(app.getHttpServer()).get('/quote').expect(401);
    });

    it('GET /quote returns a paginated page for an authenticated admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/quote')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data.data)).toBe(true);
      expect(response.body.data.meta).toMatchObject({ page: 1, take: 10 });
      expect(
        response.body.data.data.some(
          (quote: { id: number }) => quote.id === quoteId,
        ),
      ).toBe(true);
    });

    it('GET /quote honors page and take query params', async () => {
      const response = await request(app.getHttpServer())
        .get('/quote')
        .query({ page: 1, take: 1 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.meta).toMatchObject({ page: 1, take: 1 });
    });

    it('GET /quote/:id rejects requests without a token', async () => {
      await request(app.getHttpServer()).get(`/quote/${quoteId}`).expect(401);
    });

    it('GET /quote/:id returns the quote for an authenticated admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/quote/${quoteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(quoteId);
    });

    it('GET /quote/:id returns 404 for a non-existent quote', async () => {
      await request(app.getHttpServer())
        .get('/quote/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /quote search and filters', () => {
    const adminEmail = 'e2e-quote-filter-admin@jeenj.com';
    const adminPassword = 'AdminPass123!';
    let adminToken: string;
    let homeQuoteId: number;
    let officeQuoteId: number;

    const list = (query: Record<string, string | number>) =>
      request(app.getHttpServer())
        .get('/quote')
        .query({ take: 100, ...query })
        .set('Authorization', `Bearer ${adminToken}`);

    const idsOf = (response: request.Response): number[] =>
      (response.body.data.data as { id: number }[]).map((quote) => quote.id);

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

      const [home, office] = await quoteRepository.save([
        quoteRepository.create({
          kindOfClean: KindOfClean.HOME,
          name: 'Filter Zephyrine Home',
          phone: '+374 77 987654',
          area: 'Filterville Kentron',
          consentAccepted: true,
          language: SubmissionLanguage.HY,
          sourcePage: 'contact',
        }),
        quoteRepository.create({
          kindOfClean: KindOfClean.OFFICE,
          name: 'Filter Zephyrine Office',
          phone: '+374 77 111222',
          area: 'Filterville Arabkir',
          consentAccepted: true,
          language: SubmissionLanguage.EN,
          sourcePage: 'contact',
        }),
      ]);
      homeQuoteId = home.id;
      officeQuoteId = office.id;
    });

    afterAll(async () => {
      await adminRepository.delete({ email: adminEmail });
      await quoteRepository.delete({ name: Like('Filter Zephyrine%') });
    });

    it('matches the search text against name and area, case-insensitively', async () => {
      const byName = await list({ search: 'zephyrine' }).expect(200);
      expect(idsOf(byName)).toEqual(
        expect.arrayContaining([homeQuoteId, officeQuoteId]),
      );

      const byArea = await list({ search: 'filterville arabkir' }).expect(200);
      expect(idsOf(byArea)).toEqual([officeQuoteId]);
    });

    it('matches a phone typed in another format by its digits', async () => {
      const response = await list({ search: '077 987654' }).expect(200);
      expect(idsOf(response)).toEqual([homeQuoteId]);
    });

    it('treats "#<id>" as an exact id lookup', async () => {
      const response = await list({ search: `#${homeQuoteId}` }).expect(200);
      expect(idsOf(response)).toEqual([homeQuoteId]);
      expect(response.body.data.meta.itemCount).toBe(1);
    });

    it('treats LIKE wildcards in the search text literally', async () => {
      const response = await list({ search: 'Zephyrine%Office' }).expect(200);
      expect(idsOf(response)).toEqual([]);
    });

    it('filters by kind of clean, language and assignment', async () => {
      const response = await list({
        search: 'Zephyrine',
        kindOfClean: KindOfClean.OFFICE,
        language: SubmissionLanguage.EN,
        assignment: QuoteAssignment.UNASSIGNED,
      }).expect(200);
      expect(idsOf(response)).toEqual([officeQuoteId]);

      const assigned = await list({
        search: 'Zephyrine',
        assignment: QuoteAssignment.ASSIGNED,
      }).expect(200);
      expect(idsOf(assigned)).toEqual([]);
    });

    it('filters by creation date range', async () => {
      const today = new Date().toISOString().slice(0, 10);

      const fromFarFuture = await list({
        search: 'Zephyrine',
        createdFrom: '2999-01-01',
      }).expect(200);
      expect(idsOf(fromFarFuture)).toEqual([]);

      const untilFarPast = await list({
        search: 'Zephyrine',
        createdTo: '2000-01-01',
      }).expect(200);
      expect(idsOf(untilFarPast)).toEqual([]);

      const aroundToday = await list({
        search: 'Zephyrine',
        createdFrom: '2000-01-01',
        createdTo: today,
      }).expect(200);
      expect(idsOf(aroundToday)).toEqual(
        expect.arrayContaining([homeQuoteId, officeQuoteId]),
      );
    });

    it('rejects unknown filter values', async () => {
      await list({ assignment: 'maybe' }).expect(400);
      await list({ createdFrom: 'yesterday' }).expect(400);
    });
  });

  describe('PATCH /quote/:id/assign-cleaner (admin-guarded)', () => {
    const adminEmail = 'e2e-quote-assign-admin@jeenj.com';
    const adminPassword = 'AdminPass123!';
    let adminToken: string;
    let quoteId: number;
    let verifiedCleanerId: number;
    let pendingCleanerId: number;

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

      quoteId = (await createStoredQuote('Assign Target')).id;

      const verifiedCleaner = await cleanerRepository.save(
        cleanerRepository.create({
          fullName: 'Verified Cleaner',
          phone: '055123457',
          cityArea: 'Some area',
          cleaningExperience: CleaningExperience.ONE_TO_THREE,
          availability: [Availability.WEEKENDS],
          servicesCanDo: [CleanerSkill.HOME],
          hasOwnSupplies: false,
          consentAccepted: true,
          language: null,
          sourcePage: 'for-cleaners',
          status: CleanerStatus.VERIFIED,
        }),
      );
      verifiedCleanerId = verifiedCleaner.id;

      const pendingCleaner = await cleanerRepository.save(
        cleanerRepository.create({
          fullName: 'Pending Cleaner',
          phone: '055123458',
          cityArea: 'Some area',
          cleaningExperience: CleaningExperience.ONE_TO_THREE,
          availability: [Availability.WEEKENDS],
          servicesCanDo: [CleanerSkill.HOME],
          hasOwnSupplies: false,
          consentAccepted: true,
          language: null,
          sourcePage: 'for-cleaners',
        }),
      );
      pendingCleanerId = pendingCleaner.id;
    });

    afterAll(async () => {
      await adminRepository.delete({ email: adminEmail });
      await quoteRepository.delete({ name: 'Assign Target' });
      await cleanerRepository.delete({ fullName: 'Verified Cleaner' });
      await cleanerRepository.delete({ fullName: 'Pending Cleaner' });
    });

    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .patch(`/quote/${quoteId}/assign-cleaner`)
        .send({ cleanerId: verifiedCleanerId })
        .expect(401);
    });

    it('rejects assigning a cleaner that is not verified', async () => {
      await request(app.getHttpServer())
        .patch(`/quote/${quoteId}/assign-cleaner`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cleanerId: pendingCleanerId })
        .expect(400);
    });

    it('returns 404 when the cleaner does not exist', async () => {
      await request(app.getHttpServer())
        .patch(`/quote/${quoteId}/assign-cleaner`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cleanerId: 999999 })
        .expect(404);
    });

    it('returns 404 when the quote does not exist', async () => {
      await request(app.getHttpServer())
        .patch('/quote/999999/assign-cleaner')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cleanerId: verifiedCleanerId })
        .expect(404);
    });

    it('assigns a verified cleaner to the quote', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/quote/${quoteId}/assign-cleaner`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cleanerId: verifiedCleanerId })
        .expect(200);

      expect(response.body.data.assignedCleaner.id).toBe(verifiedCleanerId);
    });

    it('records when the cleaner was assigned, lists the quote under that cleaner, and unassigns', async () => {
      const before = Date.now();
      const assigned = await request(app.getHttpServer())
        .patch(`/quote/${quoteId}/assign-cleaner`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cleanerId: verifiedCleanerId })
        .expect(200);
      expect(
        new Date(assigned.body.data.assignedAt as string).getTime(),
      ).toBeGreaterThanOrEqual(before - 60_000);

      const byCleaner = await request(app.getHttpServer())
        .get('/quote')
        .query({ cleanerId: verifiedCleanerId, take: 100 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(
        (byCleaner.body.data.data as { id: number }[]).map((quote) => quote.id),
      ).toContain(quoteId);

      const unassigned = await request(app.getHttpServer())
        .delete(`/quote/${quoteId}/assign-cleaner`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(unassigned.body.data.assignedCleaner).toBeNull();
      expect(unassigned.body.data.assignedAt).toBeNull();
    });

    it('rejects unassigning without a token', async () => {
      await request(app.getHttpServer())
        .delete(`/quote/${quoteId}/assign-cleaner`)
        .expect(401);
    });
  });
});
