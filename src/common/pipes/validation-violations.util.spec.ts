import 'reflect-metadata';
import { plainToInstance, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsString,
  MaxLength,
  Min,
  validate,
  ValidateNested,
} from 'class-validator';
import { TranslatedText } from '../types';
import { IsTranslatedText, IsValidPhone } from '../validators';
import { toValidationViolations } from './validation-violations.util';

class AddressDto {
  @IsString()
  street: string;
}

class SampleDto {
  @MaxLength(5)
  name: string;

  @Min(3)
  count: number;

  @IsValidPhone()
  phone: string;

  @IsTranslatedText({ minLength: 2, maxLength: 10 })
  title: TranslatedText;

  @IsTranslatedText()
  description: TranslatedText;

  @IsArray()
  @ArrayUnique()
  tags: string[];

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}

const violationsFor = async (plain: Record<string, unknown>) => {
  const errors = await validate(plainToInstance(SampleDto, plain));
  return toValidationViolations(errors);
};

const validPlain = {
  name: 'abc',
  count: 3,
  phone: '055123456',
  title: { en: 'Title' },
  description: { en: 'Body' },
  tags: ['a'],
  address: { street: 'Main' },
};

describe('toValidationViolations', () => {
  it('returns no violations for a valid object', async () => {
    await expect(violationsFor(validPlain)).resolves.toEqual([]);
  });

  it('includes the constraint value for length and range rules', async () => {
    const violations = await violationsFor({
      ...validPlain,
      name: 'too long',
      count: 1,
    });

    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'name',
          key: 'maxLength',
          args: { max: 5 },
        }),
        expect.objectContaining({
          field: 'count',
          key: 'min',
          args: { min: 3 },
        }),
      ]),
    );
  });

  it('resolves custom validator names', async () => {
    const violations = await violationsFor({ ...validPlain, phone: 'abc' });

    expect(violations).toEqual([
      expect.objectContaining({ field: 'phone', key: 'isValidPhone' }),
    ]);
  });

  it('uses the length variant for translated text with length rules', async () => {
    const violations = await violationsFor({
      ...validPlain,
      title: { hy: 'x' },
      description: {},
    });

    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'title',
          key: 'isTranslatedTextLength',
          args: { min: 2, max: 10 },
        }),
        expect.objectContaining({
          field: 'description',
          key: 'isTranslatedText',
          args: {},
        }),
      ]),
    );
  });

  it('reports one violation per failed constraint', async () => {
    const violations = await violationsFor({ ...validPlain, tags: 'a' });

    expect(violations.map((violation) => violation.key)).toEqual(
      expect.arrayContaining(['isArray', 'arrayUnique']),
    );
  });

  it('uses a dotted path for nested fields', async () => {
    const violations = await violationsFor({
      ...validPlain,
      address: { street: 1 },
    });

    expect(violations).toEqual([
      expect.objectContaining({ field: 'address.street', key: 'isString' }),
    ]);
  });

  it('keeps the class-validator message as a fallback', async () => {
    const [violation] = await violationsFor({
      ...validPlain,
      name: 'too long',
    });

    expect(violation.fallbackMessage).toBe(
      'name must be shorter than or equal to 5 characters',
    );
  });
});
