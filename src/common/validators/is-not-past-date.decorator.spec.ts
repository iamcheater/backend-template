import { validate } from 'class-validator';
import { IsNotPastDate } from './is-not-past-date.decorator';

class DateTestDto {
  @IsNotPastDate()
  date: string;
}

async function validateDate(date: unknown): Promise<boolean> {
  const dto = new DateTestDto();
  dto.date = date as string;
  const errors = await validate(dto);
  return errors.length === 0;
}

describe('IsNotPastDate', () => {
  it('accepts today', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await expect(validateDate(today)).resolves.toBe(true);
  });

  it('accepts a future date', async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    await expect(validateDate(future)).resolves.toBe(true);
  });

  it('rejects a past date', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    await expect(validateDate(past)).resolves.toBe(false);
  });

  it('rejects non-date strings', async () => {
    await expect(validateDate('not-a-date')).resolves.toBe(false);
  });

  it('rejects non-string values', async () => {
    await expect(validateDate(undefined)).resolves.toBe(false);
  });
});
