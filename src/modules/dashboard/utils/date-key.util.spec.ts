import { dateKeysBetween, shiftDateKey } from './date-key.util';

describe('shiftDateKey', () => {
  it('moves across month and year boundaries', () => {
    expect(shiftDateKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDateKey('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('is unaffected by daylight-saving changes', () => {
    expect(shiftDateKey('2026-03-28', 2)).toBe('2026-03-30');
    expect(shiftDateKey('2026-10-26', -2)).toBe('2026-10-24');
  });
});

describe('dateKeysBetween', () => {
  it('lists every day, inclusive of both ends', () => {
    expect(dateKeysBetween('2026-02-27', '2026-03-02')).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
  });

  it('returns a single day when both ends match', () => {
    expect(dateKeysBetween('2026-10-18', '2026-10-18')).toEqual(['2026-10-18']);
  });
});
