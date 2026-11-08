import { Test, TestingModule } from '@nestjs/testing';
import { CleaningComponentController } from './cleaning-component.controller';
import { CleaningComponentService } from './cleaning-component.service';
import { CleaningComponentEntity } from './entities';

describe('CleaningComponentController', () => {
  let controller: CleaningComponentController;
  let service: jest.Mocked<CleaningComponentService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CleaningComponentController],
      providers: [
        {
          provide: CleaningComponentService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(CleaningComponentController);
    service = module.get(CleaningComponentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates to the service and returns its result', async () => {
      const created = {
        id: 1,
        title: { en: 'Dust removal' },
      } as CleaningComponentEntity;
      service.create.mockResolvedValue(created);

      const dto = { title: { en: 'Dust removal' } };
      await expect(controller.create(dto)).resolves.toBe(created);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('delegates the search term to the service', async () => {
      const components = [{ id: 1 }] as CleaningComponentEntity[];
      service.findAll.mockResolvedValue(components);

      const result = await controller.findAll('dust');

      expect(service.findAll).toHaveBeenCalledWith('dust');
      expect(result).toBe(components);
    });
  });

  describe('findOne', () => {
    it('delegates to the service with the id', async () => {
      const found = { id: 1 } as CleaningComponentEntity;
      service.findById.mockResolvedValue(found);

      await expect(controller.findOne(1)).resolves.toBe(found);
      expect(service.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('delegates to the service with the id and dto', async () => {
      const updated = {
        id: 1,
        title: { en: 'New Title' },
      } as CleaningComponentEntity;
      service.update.mockResolvedValue(updated);

      const dto = { title: { en: 'New Title' } };
      const result = await controller.update(1, dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toBe(updated);
    });
  });

  describe('remove', () => {
    it('delegates to the service with the id', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
