import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { CleanerEntity } from 'src/modules/cleaner/entities';
import { CleanerStatus } from 'src/modules/cleaner/enums';
import { QuoteEntity } from 'src/modules/quote/entities';
import {
  CleanerStatsDto,
  DailySubmissionsDto,
  DashboardStatsDto,
  KindOfCleanCountDto,
  QuoteStatsDto,
} from './dtos';
import { dateKeysBetween, shiftDateKey } from './utils';

const DAYS_PER_WEEK = 7;
const DAILY_WINDOW_DAYS = 30;

interface WeekBounds {
  lastWeekFrom: string;
  previousWeekFrom: string;
}

interface DailyCountRow {
  day: string;
  count: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(QuoteEntity)
    private readonly quoteRepository: Repository<QuoteEntity>,
    @InjectRepository(CleanerEntity)
    private readonly cleanerRepository: Repository<CleanerEntity>,
  ) {}

  async getStats(): Promise<DashboardStatsDto> {
    const today = await this.currentDateKey();
    const lastWeekFrom = shiftDateKey(today, 1 - DAYS_PER_WEEK);
    const weeks: WeekBounds = {
      lastWeekFrom,
      previousWeekFrom: shiftDateKey(lastWeekFrom, -DAYS_PER_WEEK),
    };
    const dailyFrom = shiftDateKey(today, 1 - DAILY_WINDOW_DAYS);

    const [
      quotes,
      cleaners,
      dailyQuotes,
      dailyApplications,
      quotesByKindOfClean,
    ] = await Promise.all([
      this.quoteStats(weeks),
      this.cleanerStats(weeks),
      this.dailyCounts(this.quoteRepository, 'quote', dailyFrom),
      this.dailyCounts(this.cleanerRepository, 'cleaner', dailyFrom),
      this.quotesByKindOfClean(),
    ]);

    return {
      today,
      lastWeekFrom,
      quotes,
      cleaners,
      daily: this.mergeDaily(
        dateKeysBetween(dailyFrom, today),
        dailyQuotes,
        dailyApplications,
      ),
      quotesByKindOfClean,
    };
  }

  private async currentDateKey(): Promise<string> {
    const [row] = await this.quoteRepository.query<{ today: string }[]>(
      "SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') AS today",
    );
    return row.today;
  }

  private async quoteStats(weeks: WeekBounds): Promise<QuoteStatsDto> {
    const row = await this.quoteRepository
      .createQueryBuilder('quote')
      .select('COUNT(*)::int', 'total')
      .addSelect(
        'COUNT(*) FILTER (WHERE "quote"."assignedCleanerId" IS NULL)::int',
        'unassigned',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE quote.createdAt >= CAST(:lastWeekFrom AS date))::int',
        'lastWeek',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE quote.createdAt >= CAST(:previousWeekFrom AS date) AND quote.createdAt < CAST(:lastWeekFrom AS date))::int',
        'previousWeek',
      )
      .setParameters({ ...weeks })
      .getRawOne<QuoteStatsDto>();

    return {
      total: row?.total ?? 0,
      unassigned: row?.unassigned ?? 0,
      lastWeek: row?.lastWeek ?? 0,
      previousWeek: row?.previousWeek ?? 0,
    };
  }

  private async cleanerStats(weeks: WeekBounds): Promise<CleanerStatsDto> {
    const query = this.cleanerRepository
      .createQueryBuilder('cleaner')
      .select('COUNT(*)::int', 'total')
      .addSelect(
        'COUNT(*) FILTER (WHERE cleaner.createdAt >= CAST(:lastWeekFrom AS date))::int',
        'lastWeek',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE cleaner.createdAt >= CAST(:previousWeekFrom AS date) AND cleaner.createdAt < CAST(:lastWeekFrom AS date))::int',
        'previousWeek',
      )
      .setParameters({ ...weeks });

    for (const status of Object.values(CleanerStatus)) {
      query
        .addSelect(
          `COUNT(*) FILTER (WHERE cleaner.status = :status_${status})::int`,
          status,
        )
        .setParameter(`status_${status}`, status);
    }

    const row = await query.getRawOne<Record<string, number>>();

    return {
      total: row?.total ?? 0,
      lastWeek: row?.lastWeek ?? 0,
      previousWeek: row?.previousWeek ?? 0,
      byStatus: Object.fromEntries(
        Object.values(CleanerStatus).map((status) => [
          status,
          row?.[status] ?? 0,
        ]),
      ) as Record<CleanerStatus, number>,
    };
  }

  private dailyCounts<T extends ObjectLiteral>(
    repository: Repository<T>,
    alias: string,
    from: string,
  ): Promise<DailyCountRow[]> {
    return repository
      .createQueryBuilder(alias)
      .select(`to_char(${alias}.createdAt, 'YYYY-MM-DD')`, 'day')
      .addSelect('COUNT(*)::int', 'count')
      .where(`${alias}.createdAt >= CAST(:from AS date)`, { from })
      .groupBy('day')
      .getRawMany<DailyCountRow>();
  }

  private quotesByKindOfClean(): Promise<KindOfCleanCountDto[]> {
    return this.quoteRepository
      .createQueryBuilder('quote')
      .select('quote.kindOfClean', 'kindOfClean')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('quote.kindOfClean')
      .orderBy('count', 'DESC')
      .getRawMany<KindOfCleanCountDto>();
  }

  private mergeDaily(
    days: string[],
    quotes: DailyCountRow[],
    applications: DailyCountRow[],
  ): DailySubmissionsDto[] {
    const quoteCounts = new Map(quotes.map((row) => [row.day, row.count]));
    const applicationCounts = new Map(
      applications.map((row) => [row.day, row.count]),
    );

    return days.map((date) => ({
      date,
      quotes: quoteCounts.get(date) ?? 0,
      applications: applicationCounts.get(date) ?? 0,
    }));
  }
}
