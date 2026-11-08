import { Test, TestingModule } from '@nestjs/testing';
import { CleanerExpectationController } from './cleaner-expectation.controller';
import { CleanerExpectationService } from './cleaner-expectation.service';
import { CleanerExpectationEntity } from './entities';

describe('CleanerExpectationController', () => {
  let controller: CleanerExpectationController;
  let service: jest.Mocked<CleanerExpectationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CleanerExpectationController],
      providers: [
        {
          provide: CleanerExpectationService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(CleanerExpectationController);
    service = module.get(CleanerExpectationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates to the service and returns its result', async () => {
      const dto = {
        title: { en: 'Be on time' },
        description: { en: 'Arrive on schedule' },
      };
      const created = { id: 1, ...dto } as CleanerExpectationEntity;
      service.create.mockResolvedValue(created);

      await expect(controller.create(dto)).resolves.toBe(created);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('delegates to the service and returns its result', async () => {
      const expectations = [{ id: 1 }] as CleanerExpectationEntity[];
      service.findAll.mockResolvedValue(expectations);

      await expect(controller.findAll()).resolves.toBe(expectations);
    });
  });

  describe('update', () => {
    it('delegates to the service with the id and dto', async () => {
      const updated = {
        id: 1,
        title: { en: 'Be on time', hy: 'Ժամանակին' },
        order: 2,
      } as CleanerExpectationEntity;
      service.update.mockResolvedValue(updated);

      const dto = { title: { hy: 'Ժամանակին' }, order: 2 };
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
