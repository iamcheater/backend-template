import 'reflect-metadata';
import { SelectQueryBuilder } from 'typeorm';
import { SubmissionPageOptionsDto } from 'src/common/dtos';
import { SubmissionLanguage } from 'src/common/enums';
import { applySubmissionFilters } from './submission-filters.util';

describe('applySubmissionFilters', () => {
  const apply = (options: Partial<SubmissionPageOptionsDto>) => {
    const query = { andWhere: jest.fn<unknown, unknown[]>() };
    applySubmissionFilters(
      query as unknown as SelectQueryBuilder<object>,
      'record',
      Object.assign(new SubmissionPageOptionsDto(), options),
      { text: ['name'], phone: 'phone' },
    );
    return query.andWhere.mock.calls;
  };

  it('adds nothing when no filter is set', () => {
    expect(apply({})).toEqual([]);
  });

  it('filters by language and an inclusive creation date range', () => {
    expect(
      apply({
        language: SubmissionLanguage.RU,
        createdFrom: '2026-10-01',
        createdTo: '2026-10-07',
      }),
    ).toEqual([
      ['record.language = :language', { language: SubmissionLanguage.RU }],
      [
        'record.createdAt >= CAST(:createdFrom AS date)',
        { createdFrom: '2026-10-01' },
      ],
      [
        "record.createdAt < CAST(:createdTo AS date) + INTERVAL '1 day'",
        { createdTo: '2026-10-07' },
      ],
    ]);
  });

  it('applies the search', () => {
    expect(apply({ search: 'Jane' })).toEqual([
      [
        '(record.name ILIKE :searchText OR record.phone ILIKE :searchText)',
        { searchText: '%Jane%' },
      ],
    ]);
  });
});
