import { validate } from 'class-validator';
import { IsValidPhone } from './is-valid-phone.decorator';

class PhoneTestDto {
  @IsValidPhone()
  phone: string;
}

async function validatePhone(phone: unknown): Promise<boolean> {
  const dto = new PhoneTestDto();
  dto.phone = phone as string;
  const errors = await validate(dto);
  return errors.length === 0;
}

describe('IsValidPhone', () => {
  it('accepts a valid local Armenian number without a country code', async () => {
    await expect(validatePhone('055123456')).resolves.toBe(true);
  });

  it('accepts a valid Armenian number with the +374 country code', async () => {
    await expect(validatePhone('+374 55 123456')).resolves.toBe(true);
    await expect(validatePhone('+37455123456')).resolves.toBe(true);
  });

  it('accepts a valid number from another country when given with its country code', async () => {
    await expect(validatePhone('+14155552671')).resolves.toBe(true);
  });

  it('rejects a number that is too short to be real', async () => {
    await expect(validatePhone('12345')).resolves.toBe(false);
  });

  it('rejects a digit string that is not a valid Armenian number', async () => {
    await expect(validatePhone('123456')).resolves.toBe(false);
  });

  it('rejects letters and other non-phone characters', async () => {
    await expect(validatePhone('abc123456')).resolves.toBe(false);
    await expect(validatePhone('055123456; DROP TABLE')).resolves.toBe(false);
  });

  it('rejects non-string values', async () => {
    await expect(validatePhone(123456)).resolves.toBe(false);
    await expect(validatePhone(undefined)).resolves.toBe(false);
  });
});
