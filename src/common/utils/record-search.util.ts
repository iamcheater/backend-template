import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

const EXACT_ID_PATTERN = /^#(\d{1,9})$/;
const ID_PATTERN = /^\d{1,9}$/;
const PHONE_LIKE_PATTERN = /^[\d\s()+-]+$/;
const MIN_PHONE_DIGITS = 3;

export interface RecordSearchColumns {
  text: string[];
  phone: string;
}

export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function phoneDigitsOf(term: string): string | null {
  if (!PHONE_LIKE_PATTERN.test(term)) {
    return null;
  }

  const digits = term.replace(/\D/g, '').replace(/^0+/, '');
  return digits.length >= MIN_PHONE_DIGITS ? digits : null;
}

export function applyRecordSearch<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  alias: string,
  term: string,
  columns: RecordSearchColumns,
): void {
  const exactId = EXACT_ID_PATTERN.exec(term);

  if (exactId) {
    query.andWhere(`${alias}.id = :searchId`, { searchId: Number(exactId[1]) });
    return;
  }

  const conditions = [...columns.text, columns.phone].map(
    (column) => `${alias}.${column} ILIKE :searchText`,
  );
  const parameters: Record<string, unknown> = {
    searchText: `%${escapeLikePattern(term)}%`,
  };

  if (ID_PATTERN.test(term)) {
    conditions.push(`${alias}.id = :searchId`);
    parameters.searchId = Number(term);
  }

  const phoneDigits = phoneDigitsOf(term);

  if (phoneDigits) {
    conditions.push(
      `regexp_replace(${alias}.${columns.phone}, '\\D', '', 'g') LIKE :searchDigits`,
    );
    parameters.searchDigits = `%${phoneDigits}%`;
  }

  query.andWhere(`(${conditions.join(' OR ')})`, parameters);
}
