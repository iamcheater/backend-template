import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CleaningComponentService } from './cleaning-component.service';
import { CleaningComponentEntity } from './entities';
import {
  CleaningComponentNotFoundException,
  InvalidCleaningComponentSelectionException,
} from './exceptions';

describe('CleaningComponentService', () => {
  let service: CleaningComponentService;
  let repository: jest.Mocked<Repository<CleaningComponentEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleaningComponentService,
        {
          provide: getRepositoryToken(CleaningComponentEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CleaningComponentService);
    repository = module.get(getRepositoryToken(CleaningComponentEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a component, defaulting description to null', async () => {
      const created = {
        id: 1,
        title: { en: 'Dust removal' },
      } as CleaningComponentEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      const result = await service.create({ title: { en: 'Dust removal' } });

      expect(repository.create).toHaveBeenCalledWith({
        title: { en: 'Dust removal' },
        description: null,
      });
      expect(result).toBe(created);
    });

    it('drops empty translations from the description', async () => {
      repository.create.mockImplementation(
        (entity) => entity as CleaningComponentEntity,
      );
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as CleaningComponentEntity),
      );

      await service.create({
        title: { en: 'Dust removal' },
        description: { en: 'Surfaces', hy: '' },
      });

      expect(repository.create).toHaveBeenCalledWith({
        title: { en: 'Dust removal' },
        description: { en: 'Surfaces' },
      });
    });

    it('drops empty translations from the title', async () => {
      repository.create.mockImplementation(
        (entity) => entity as CleaningComponentEntity,
      );
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as CleaningComponentEntity),
      );

      await service.create({ title: { en: 'Dust removal', hy: '', ru: '' } });

      expect(repository.create).toHaveBeenCalledWith({
        title: { en: 'Dust removal' },
        description: null,
      });
    });
  });

  describe('findAll', () => {
    function mockQueryBuilder(components: CleaningComponentEntity[]) {
      const builder = {
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(components),
      };
      repository.createQueryBuilder.mockReturnValue(
        builder as unknown as ReturnType<typeof repository.createQueryBuilder>,
      );
      return builder;
    }

    it('returns every component ordered by English title when no search is given', async () => {
      const components = [{ id: 1 }, { id: 2 }] as CleaningComponentEntity[];
      const builder = mockQueryBuilder(components);

      const result = await service.findAll();

      expect(builder.orderBy).toHaveBeenCalledWith(
        "component.title ->> 'en'",
        'ASC',
      );
      expect(builder.where).not.toHaveBeenCalled();
      expect(result).toBe(components);
    });

    it('searches the title in every language when a search term is given', async () => {
      const components = [{ id: 1 }] as CleaningComponentEntity[];
      const builder = mockQueryBuilder(components);

      const result = await service.findAll('dust');

      const [condition, parameters] = builder.where.mock.calls[0] as [
        string,
        Record<string, string>,
      ];
      expect(condition).toContain("component.title ->> 'en' ILIKE :search");
      expect(condition).toContain("component.title ->> 'hy' ILIKE :search");
      expect(condition).toContain("component.title ->> 'ru' ILIKE :search");
      expect(parameters).toEqual({ search: '%dust%' });
      expect(result).toBe(components);
    });
  });

  describe('findById', () => {
    it('throws CleaningComponentNotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(
        CleaningComponentNotFoundException,
      );
    });

    it('returns the component when found', async () => {
      const found = { id: 1 } as CleaningComponentEntity;
      repository.findOne.mockResolvedValue(found);

      await expect(service.findById(1)).resolves.toBe(found);
    });
  });

  describe('findByIds', () => {
    it('throws InvalidCleaningComponentSelectionException when some ids are missing', async () => {
      repository.find.mockResolvedValue([{ id: 1 } as CleaningComponentEntity]);

      await expect(service.findByIds([1, 2])).rejects.toThrow(
        InvalidCleaningComponentSelectionException,
      );
    });

    it('returns the matching components', async () => {
      const components = [{ id: 1 }, { id: 2 }] as CleaningComponentEntity[];
      repository.find.mockResolvedValue(components);

      const result = await service.findByIds([1, 2]);

      expect(result).toBe(components);
    });
  });

  describe('update', () => {
    it('throws CleaningComponentNotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(1, { title: { en: 'New Title' } }),
      ).rejects.toThrow(CleaningComponentNotFoundException);
    });

    it('merges the given translations into the stored ones', async () => {
      const existing = {
        id: 1,
        title: { en: 'Old Title', hy: 'Հին' },
        description: { en: 'Old' },
      } as CleaningComponentEntity;
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as CleaningComponentEntity),
      );

      const result = await service.update(1, {
        title: { en: 'New Title' },
        description: { ru: 'Новое' },
      });

      expect(result.title).toEqual({ en: 'New Title', hy: 'Հին' });
      expect(result.description).toEqual({ en: 'Old', ru: 'Новое' });
    });

    it('removes a translation set to an empty string', async () => {
      repository.findOne.mockResolvedValue({
        id: 1,
        title: { en: 'Title', hy: 'Վերնագիր' },
        description: null,
      } as CleaningComponentEntity);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as CleaningComponentEntity),
      );

      const result = await service.update(1, { title: { hy: '' } });

      expect(result.title).toEqual({ en: 'Title' });
    });
  });

  describe('remove', () => {
    it('throws CleaningComponentNotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toThrow(
        CleaningComponentNotFoundException,
      );
    });

    it('deletes the component', async () => {
      repository.findOne.mockResolvedValue({
        id: 1,
      } as CleaningComponentEntity);

      await service.remove(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });
});
