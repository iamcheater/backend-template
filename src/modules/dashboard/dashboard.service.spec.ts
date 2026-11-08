import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CleanerEntity } from 'src/modules/cleaner/entities';
import { QuoteEntity } from 'src/modules/quote/entities';
import { KindOfClean } from 'src/modules/quote/enums';
import { DashboardService } from './dashboard.service';

type RawResult = { one?: unknown; many?: unknown[] };

const mockBuilder = ({ one, many }: RawResult) => {
  const builder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(one),
    getRawMany: jest.fn().mockResolvedValue(many ?? []),
  };
  return builder as unknown as SelectQueryBuilder<object>;
};

describe('DashboardService', () => {
  let service: DashboardService;
  let quoteRepository: jest.Mocked<Repository<QuoteEntity>>;
  let cleanerRepository: jest.Mocked<Repository<CleanerEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getRepositoryToken(QuoteEntity),
          useValue: { query: jest.fn(), createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(CleanerEntity),
          useValue: { createQueryBuilder: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(DashboardService);
    quoteRepository = module.get(getRepositoryToken(QuoteEntity));
    cleanerRepository = module.get(getRepositoryToken(CleanerEntity));

    quoteRepository.query.mockResolvedValue([{ today: '2026-10-18' }]);
  });

  const mockQuoteQueries = (
    summary: unknown,
    daily: unknown[],
    byKind: unknown[],
  ) =>
    quoteRepository.createQueryBuilder
      .mockReturnValueOnce(mockBuilder({ one: summary }) as never)
      .mockReturnValueOnce(mockBuilder({ many: daily }) as never)
      .mockReturnValueOnce(mockBuilder({ many: byKind }) as never);

  const mockCleanerQueries = (summary: unknown, daily: unknown[]) =>
    cleanerRepository.createQueryBuilder
      .mockReturnValueOnce(mockBuilder({ one: summary }) as never)
      .mockReturnValueOnce(mockBuilder({ many: daily }) as never);

  it('combines the counts into one stats payload with a zero-filled 30-day series', async () => {
    mockQuoteQueries(
      { total: 12, unassigned: 3, lastWeek: 5, previousWeek: 4 },
      [
        { day: '2026-10-18', count: 2 },
        { day: '2026-09-19', count: 1 },
      ],
      [{ kindOfClean: KindOfClean.HOME, count: 7 }],
    );
    mockCleanerQueries(
      {
        total: 9,
        lastWeek: 2,
        previousWeek: 1,
        pending: 4,
        verified: 3,
        rejected: 2,
      },
      [{ day: '2026-10-17', count: 2 }],
    );

    const stats = await service.getStats();

    expect(stats.today).toBe('2026-10-18');
    expect(stats.lastWeekFrom).toBe('2026-10-12');
    expect(stats.quotes).toEqual({
      total: 12,
      unassigned: 3,
      lastWeek: 5,
      previousWeek: 4,
    });
    expect(stats.cleaners).toEqual({
      total: 9,
      lastWeek: 2,
      previousWeek: 1,
      byStatus: { pending: 4, verified: 3, rejected: 2 },
    });
    expect(stats.daily).toHaveLength(30);
    expect(stats.daily[0]).toEqual({
      date: '2026-09-19',
      quotes: 1,
      applications: 0,
    });
    expect(stats.daily[28]).toEqual({
      date: '2026-10-17',
      quotes: 0,
      applications: 2,
    });
    expect(stats.daily[29]).toEqual({
      date: '2026-10-18',
      quotes: 2,
      applications: 0,
    });
    expect(stats.quotesByKindOfClean).toEqual([
      { kindOfClean: KindOfClean.HOME, count: 7 },
    ]);
  });

  it('reports zeros on an empty database', async () => {
    mockQuoteQueries(undefined, [], []);
    mockCleanerQueries(undefined, []);

    const stats = await service.getStats();

    expect(stats.quotes).toEqual({
      total: 0,
      unassigned: 0,
      lastWeek: 0,
      previousWeek: 0,
    });
    expect(stats.cleaners.byStatus).toEqual({
      pending: 0,
      verified: 0,
      rejected: 0,
    });
    expect(
      stats.daily.every((day) => day.quotes === 0 && day.applications === 0),
    ).toBe(true);
  });
});
