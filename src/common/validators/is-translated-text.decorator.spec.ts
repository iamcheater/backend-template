import { validate } from 'class-validator';
import { IsTranslatedText } from './is-translated-text.decorator';

class RequiredTextDto {
  @IsTranslatedText({ minLength: 2, maxLength: 10 })
  title: unknown;
}

class PartialTextDto {
  @IsTranslatedText({ partial: true, maxLength: 10 })
  title: unknown;
}

class ClearableTextDto {
  @IsTranslatedText({ partial: true, allowClearingDefault: true })
  title: unknown;
}

async function isValid(
  Dto: new () => { title: unknown },
  title: unknown,
): Promise<boolean> {
  const dto = new Dto();
  dto.title = title;
  return (await validate(dto)).length === 0;
}

describe('IsTranslatedText', () => {
  it('accepts an object with every supported language', async () => {
    await expect(
      isValid(RequiredTextDto, { en: 'Clean', hy: 'Մաքուր', ru: 'Чисто' }),
    ).resolves.toBe(true);
  });

  it('accepts English alone and treats empty translations as missing', async () => {
    await expect(isValid(RequiredTextDto, { en: 'Clean' })).resolves.toBe(true);
    await expect(
      isValid(RequiredTextDto, { en: 'Clean', hy: '', ru: '' }),
    ).resolves.toBe(true);
  });

  it('rejects a missing or empty English value when not partial', async () => {
    await expect(isValid(RequiredTextDto, { hy: 'Մաքուր' })).resolves.toBe(
      false,
    );
    await expect(isValid(RequiredTextDto, { en: '' })).resolves.toBe(false);
  });

  it('rejects plain strings, arrays and null', async () => {
    await expect(isValid(RequiredTextDto, 'Clean')).resolves.toBe(false);
    await expect(isValid(RequiredTextDto, ['Clean'])).resolves.toBe(false);
    await expect(isValid(RequiredTextDto, null)).resolves.toBe(false);
  });

  it('rejects unsupported languages and non-string values', async () => {
    await expect(
      isValid(RequiredTextDto, { en: 'Clean', de: 'Sauber' }),
    ).resolves.toBe(false);
    await expect(
      isValid(RequiredTextDto, { en: 'Clean', hy: 5 }),
    ).resolves.toBe(false);
  });

  it('enforces length rules on every non-empty translation', async () => {
    await expect(isValid(RequiredTextDto, { en: 'C' })).resolves.toBe(false);
    await expect(
      isValid(RequiredTextDto, { en: 'Clean', ru: 'Слишком длинно' }),
    ).resolves.toBe(false);
  });

  it('lets a partial patch omit English but not clear it', async () => {
    await expect(isValid(PartialTextDto, { hy: 'Մաքուր' })).resolves.toBe(true);
    await expect(isValid(PartialTextDto, { en: '' })).resolves.toBe(false);
  });

  it('lets a clearable patch clear English', async () => {
    await expect(isValid(ClearableTextDto, { en: '' })).resolves.toBe(true);
  });
});
