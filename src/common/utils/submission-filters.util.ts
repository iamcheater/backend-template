import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { SubmissionPageOptionsDto } from 'src/common/dtos';
import { applyRecordSearch, RecordSearchColumns } from './record-search.util';

export function applySubmissionFilters<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  alias: string,
  options: SubmissionPageOptionsDto,
  searchColumns: RecordSearchColumns,
): void {
  if (options.search) {
    applyRecordSearch(query, alias, options.search, searchColumns);
  }

  if (options.language) {
    query.andWhere(`${alias}.language = :language`, {
      language: options.language,
    });
  }

  if (options.createdFrom) {
    query.andWhere(`${alias}.createdAt >= CAST(:createdFrom AS date)`, {
      createdFrom: options.createdFrom,
    });
  }

  if (options.createdTo) {
    query.andWhere(
      `${alias}.createdAt < CAST(:createdTo AS date) + INTERVAL '1 day'`,
      { createdTo: options.createdTo },
    );
  }
}
