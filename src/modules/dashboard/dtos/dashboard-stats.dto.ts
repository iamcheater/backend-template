import { CleanerStatus } from 'src/modules/cleaner/enums';
import { KindOfClean } from 'src/modules/quote/enums';

export class QuoteStatsDto {
  total: number;
  unassigned: number;
  lastWeek: number;
  previousWeek: number;
}

export class CleanerStatsDto {
  total: number;
  lastWeek: number;
  previousWeek: number;
  byStatus: Record<CleanerStatus, number>;
}

export class DailySubmissionsDto {
  date: string;
  quotes: number;
  applications: number;
}

export class KindOfCleanCountDto {
  kindOfClean: KindOfClean | null;
  count: number;
}

export class DashboardStatsDto {
  today: string;
  lastWeekFrom: string;
  quotes: QuoteStatsDto;
  cleaners: CleanerStatsDto;
  daily: DailySubmissionsDto[];
  quotesByKindOfClean: KindOfCleanCountDto[];
}
