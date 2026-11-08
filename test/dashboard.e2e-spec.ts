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
import { KindOfClean } from 'src/modules/quote/enums';
import { TelegramService } from 'src/modules/telegram/telegram.service';

interface DashboardStatsBody {
  today: string;
  lastWeekFrom: string;
  quotes: {
    total: number;
    unassigned: number;
    lastWeek: number;
    previousWeek: number;
  };
  cleaners: {
    total: number;
    lastWeek: number;
    previousWeek: number;
    byStatus: Record<CleanerStatus, number>;
  };
  daily: { date: string; quotes: number; applications: number }[];
  quotesByKindOfClean: { kindOfClean: KindOfClean | null; count: number }[];
}

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let quoteRepository: Repository<QuoteEntity>;
  let cleanerRepository: Repository<CleanerEntity>;
  let adminRepository: Repository<AdminEntity>;
  let adminToken: string;

  const adminEmail = 'e2e-dashboard-admin@jeenj.com';
  const adminPassword = 'AdminPass123!';
  const NAME_PREFIX = 'E2E Dashboard';

  const fetchStats = async (): Promise<DashboardStatsBody> => {
    const response = await request(app.getHttpServer())
      .get('/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    return response.body.data as DashboardStatsBody;
  };

  const kindCount = (stats: DashboardStatsBody, kind: KindOfClean) =>
    stats.quotesByKindOfClean.find((row) => row.kindOfClean === kind)?.count ??
    0;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TelegramService)
      .useValue({ sendMessage: jest.fn().mockResolvedValue(undefined) })
      .overrideProvider(S3Service)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    quoteRepository = moduleFixture.get(getRepositoryToken(QuoteEntity));
    cleanerRepository = moduleFixture.get(getRepositoryToken(CleanerEntity));
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

  afterEach(async () => {
    await quoteRepository.delete({ name: Like(`${NAME_PREFIX}%`) });
    await cleanerRepository.delete({ fullName: Like(`${NAME_PREFIX}%`) });
  });

  afterAll(async () => {
    await adminRepository.delete({ email: adminEmail });
    await app.close();
  });

  it('rejects requests without a token', async () => {
    await request(app.getHttpServer()).get('/dashboard/stats').expect(401);
  });

  it('returns a zero-filled 30-day series ending today', async () => {
    const stats = await fetchStats();

    expect(stats.daily).toHaveLength(30);
    expect(stats.daily[stats.daily.length - 1].date).toBe(stats.today);
    expect(stats.lastWeekFrom).toBe(stats.daily[23].date);
  });

  it('counts new submissions in totals, the current week, today and their breakdowns', async () => {
    const before = await fetchStats();

    await quoteRepository.save(
      quoteRepository.create({
        kindOfClean: KindOfClean.RENTAL,
        name: `${NAME_PREFIX} Quote`,
        phone: '055123456',
        area: 'Somewhere',
        consentAccepted: true,
        language: null,
        sourcePage: 'contact',
      }),
    );
    await cleanerRepository.save(
      cleanerRepository.create({
        fullName: `${NAME_PREFIX} Cleaner`,
        phone: '055123456',
        cityArea: 'Somewhere',
        cleaningExperience: CleaningExperience.NONE,
        availability: [Availability.WEEKENDS],
        servicesCanDo: [CleanerSkill.HOME],
        hasOwnSupplies: false,
        consentAccepted: true,
        language: null,
        sourcePage: 'for-cleaners',
      }),
    );

    const after = await fetchStats();
    const lastDay = (stats: DashboardStatsBody) =>
      stats.daily[stats.daily.length - 1];

    expect(after.quotes.total).toBeGreaterThanOrEqual(before.quotes.total + 1);
    expect(after.quotes.unassigned).toBeGreaterThanOrEqual(
      before.quotes.unassigned + 1,
    );
    expect(after.quotes.lastWeek).toBeGreaterThanOrEqual(
      before.quotes.lastWeek + 1,
    );
    expect(after.cleaners.total).toBeGreaterThanOrEqual(
      before.cleaners.total + 1,
    );
    expect(after.cleaners.lastWeek).toBeGreaterThanOrEqual(
      before.cleaners.lastWeek + 1,
    );
    expect(after.cleaners.byStatus.pending).toBeGreaterThanOrEqual(
      before.cleaners.byStatus.pending + 1,
    );
    expect(lastDay(after).quotes).toBeGreaterThanOrEqual(
      lastDay(before).quotes + 1,
    );
    expect(lastDay(after).applications).toBeGreaterThanOrEqual(
      lastDay(before).applications + 1,
    );
    expect(kindCount(after, KindOfClean.RENTAL)).toBeGreaterThanOrEqual(
      kindCount(before, KindOfClean.RENTAL) + 1,
    );
  });
});
