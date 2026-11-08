import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { CleanerExpectationService } from './cleaner-expectation.service';
import { CleanerExpectationEntity } from './entities';
import { CleanerExpectationNotFoundException } from './exceptions';

describe('CleanerExpectationService', () => {
  let service: CleanerExpectationService;
  let repository: jest.Mocked<Repository<CleanerExpectationEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanerExpectationService,
        {
          provide: getRepositoryToken(CleanerExpectationEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CleanerExpectationService);
    repository = module.get(getRepositoryToken(CleanerExpectationEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('defaults order to 0 when not given', async () => {
      const created = { id: 1 } as CleanerExpectationEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      await service.create({
        title: { en: 'Be on time' },
        description: { en: 'Arrive on schedule' },
      });

      expect(repository.create).toHaveBeenCalledWith({
        title: { en: 'Be on time' },
        description: { en: 'Arrive on schedule' },
        order: 0,
      });
    });

    it('drops empty translations before storing', async () => {
      const created = { id: 1 } as CleanerExpectationEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      await service.create({
        title: { en: 'Be on time', hy: 'Ժամանակին', ru: '' },
        description: { en: 'Arrive on schedule', hy: '' },
      });

      expect(repository.create).toHaveBeenCalledWith({
        title: { en: 'Be on time', hy: 'Ժամանակին' },
        description: { en: 'Arrive on schedule' },
        order: 0,
      });
    });

    it('uses the given order when provided', async () => {
      const created = { id: 1 } as CleanerExpectationEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      await service.create({
        title: { en: 'Be on time' },
        description: { en: 'Arrive on schedule' },
        order: 3,
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ order: 3 }),
      );
    });
  });

  describe('findAll', () => {
    it('returns all expectations ordered by order', async () => {
      const expectations = [{ id: 1 }] as CleanerExpectationEntity[];
      repository.find.mockResolvedValue(expectations);

      await expect(service.findAll()).resolves.toBe(expectations);
      expect(repository.find).toHaveBeenCalledWith({
        order: { order: 'ASC' },
      });
    });
  });

  describe('findAllPublic', () => {
    it('maps entities to the public response shape in the requested language', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          title: { en: 'Be on time', hy: 'Ժամանակին' },
          description: { en: 'Arrive on schedule', hy: 'Ժամանակին եկեք' },
          order: 0,
        } as CleanerExpectationEntity,
      ]);

      const result = await service.findAllPublic(SupportedLanguage.HY);

      expect(result).toEqual([
        {
          id: 1,
          title: 'Ժամանակին',
          description: 'Ժամանակին եկեք',
          order: 0,
        },
      ]);
    });

    it('falls back to English when the requested language is missing', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          title: { en: 'Be on time', hy: 'Ժամանակին' },
          description: { en: 'Arrive on schedule' },
          order: 0,
        } as CleanerExpectationEntity,
      ]);

      const result = await service.findAllPublic(SupportedLanguage.RU);

      expect(result).toEqual([
        {
          id: 1,
          title: 'Be on time',
          description: 'Arrive on schedule',
          order: 0,
        },
      ]);
    });
  });

  describe('findById', () => {
    it('throws CleanerExpectationNotFoundException when it does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(
        CleanerExpectationNotFoundException,
      );
    });

    it('returns the expectation', async () => {
      const expectation = { id: 1 } as CleanerExpectationEntity;
      repository.findOne.mockResolvedValue(expectation);

      await expect(service.findById(1)).resolves.toBe(expectation);
    });
  });

  describe('update', () => {
    it('throws CleanerExpectationNotFoundException when it does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(1, { title: { en: 'New' } })).rejects.toThrow(
        CleanerExpectationNotFoundException,
      );
    });

    it('updates only the fields given, merging translations', async () => {
      const expectation = {
        id: 1,
        title: { en: 'Old', hy: 'Հին' },
        description: { en: 'Old desc' },
        order: 0,
      } as CleanerExpectationEntity;
      repository.findOne.mockResolvedValue(expectation);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as CleanerExpectationEntity),
      );

      const result = await service.update(1, {
        title: { en: 'New', ru: 'Новый' },
        order: 2,
      });

      expect(result.title).toEqual({ en: 'New', hy: 'Հին', ru: 'Новый' });
      expect(result.order).toBe(2);
      expect(result.description).toEqual({ en: 'Old desc' });
    });

    it('removes a translation set to an empty string', async () => {
      repository.findOne.mockResolvedValue({
        id: 1,
        title: { en: 'Title', hy: 'Վերնագիր' },
        description: { en: 'Desc', ru: 'Описание' },
        order: 0,
      } as CleanerExpectationEntity);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as CleanerExpectationEntity),
      );

      const result = await service.update(1, {
        title: { hy: '' },
        description: { ru: '' },
      });

      expect(result.title).toEqual({ en: 'Title' });
      expect(result.description).toEqual({ en: 'Desc' });
    });
  });

  describe('remove', () => {
    it('throws CleanerExpectationNotFoundException when it does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toThrow(
        CleanerExpectationNotFoundException,
      );
    });

    it('deletes the expectation when it exists', async () => {
      repository.findOne.mockResolvedValue({
        id: 1,
      } as CleanerExpectationEntity);

      await service.remove(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });
});
