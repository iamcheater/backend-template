import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateServiceDto } from './create-service.dto';
import { UpdateServiceDto } from './update-service.dto';
import { SERVICE_UPLOAD_PURPOSES } from '../utils';

const componentIdErrors = async (
  dtoClass: ClassConstructor<object>,
  componentIds: unknown,
): Promise<string[]> => {
  const dto = plainToInstance(dtoClass, {
    title: { en: 'Deep cleaning' },
    description: { en: 'Thorough clean' },
    key: 'deep-cleaning.webp',
    purpose: SERVICE_UPLOAD_PURPOSES[0],
    componentIds,
  });
  const errors = await validate(dto);
  return errors
    .filter((error) => error.property === 'componentIds')
    .flatMap((error) => Object.keys(error.constraints ?? {}));
};

describe.each<ClassConstructor<object>>([CreateServiceDto, UpdateServiceDto])(
  '%p componentIds',
  (dtoClass) => {
    it('accepts a list of unique integers', async () => {
      await expect(componentIdErrors(dtoClass, [1, 2])).resolves.toEqual([]);
    });

    it('accepts an empty list', async () => {
      await expect(componentIdErrors(dtoClass, [])).resolves.toEqual([]);
    });

    it('rejects a single integer instead of a list', async () => {
      await expect(componentIdErrors(dtoClass, 1)).resolves.toContain(
        'isArray',
      );
    });

    it('rejects duplicate ids', async () => {
      await expect(componentIdErrors(dtoClass, [1, 1])).resolves.toContain(
        'arrayUnique',
      );
    });

    it('rejects non-integer ids', async () => {
      await expect(componentIdErrors(dtoClass, ['a'])).resolves.toContain(
        'isInt',
      );
    });
  },
);
