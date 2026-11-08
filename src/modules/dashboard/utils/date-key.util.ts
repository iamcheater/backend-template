const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function shiftDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  return new Date(date.getTime() + days * MILLISECONDS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

export function dateKeysBetween(from: string, to: string): string[] {
  const keys: string[] = [];

  for (let key = from; key <= to; key = shiftDateKey(key, 1)) {
    keys.push(key);
  }

  return keys;
}
