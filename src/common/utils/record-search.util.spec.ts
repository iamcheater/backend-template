import { SelectQueryBuilder } from 'typeorm';
import { applyRecordSearch, escapeLikePattern } from './record-search.util';

describe('applyRecordSearch', () => {
  const columns = { text: ['name', 'area'], phone: 'phone' };

  const search = (term: string) => {
    const query = { andWhere: jest.fn<unknown, unknown[]>() };
    applyRecordSearch(
      query as unknown as SelectQueryBuilder<object>,
      'record',
      term,
      columns,
    );
    return query.andWhere.mock.calls;
  };

  it('treats "#<id>" as an exact id lookup only', () => {
    expect(search('#42')).toEqual([
      ['record.id = :searchId', { searchId: 42 }],
    ]);
  });

  it('matches plain text against every text column and the phone', () => {
    expect(search('Arabkir')).toEqual([
      [
        '(record.name ILIKE :searchText OR record.area ILIKE :searchText OR record.phone ILIKE :searchText)',
        { searchText: '%Arabkir%' },
      ],
    ]);
  });

  it('also matches a bare number as an id and as phone digits without leading zeros', () => {
    const [[condition, parameters]] = search('0551');

    expect(condition).toContain('record.id = :searchId');
    expect(condition).toContain(
      "regexp_replace(record.phone, '\\D', '', 'g') LIKE :searchDigits",
    );
    expect(parameters).toEqual({
      searchText: '%0551%',
      searchId: 551,
      searchDigits: '%551%',
    });
  });

  it('matches a formatted phone by its digits but not as an id', () => {
    const [[condition, parameters]] = search('+374 55 12');

    expect(condition).not.toContain('record.id');
    expect(parameters).toMatchObject({ searchDigits: '%3745512%' });
  });

  it('skips the id match for numbers too large to be an id', () => {
    const [[condition]] = search('0123456789123');

    expect(condition).not.toContain('record.id');
  });

  it('skips the phone match for too few digits or non-phone text', () => {
    expect(search('12')[0][0]).not.toContain('searchDigits');
    expect(search('Flat 12')[0][0]).not.toContain('searchDigits');
  });
});

describe('escapeLikePattern', () => {
  it('escapes LIKE wildcards and the escape character', () => {
    expect(escapeLikePattern('50%_off\\')).toBe('50\\%\\_off\\\\');
  });
});
