import { Test, TestingModule } from '@nestjs/testing';
import { PageDto, PageMetaDto } from 'src/common/dtos';
import { CleanerController } from './cleaner.controller';
import { CleanerService } from './cleaner.service';
import { CleanerPageOptionsDto } from './dtos';
import { CleanerEntity } from './entities';
import { CleanerStatus } from './enums';

describe('CleanerController', () => {
  let controller: CleanerController;
  let service: jest.Mocked<CleanerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CleanerController],
      providers: [
        {
          provide: CleanerService,
          useValue: {
            updateStatus: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(CleanerController);
    service = module.get(CleanerService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('delegates to the service with the page options and returns its result', async () => {
      const cleaners = [{ id: 1 }] as CleanerEntity[];
      const pageOptionsDto = new CleanerPageOptionsDto();
      const page = new PageDto(
        cleaners,
        new PageMetaDto({ pageOptionsDto, itemCount: 1 }),
      );
      service.findAll.mockResolvedValue(page);

      await expect(controller.findAll(pageOptionsDto)).resolves.toBe(page);
      expect(service.findAll).toHaveBeenCalledWith(pageOptionsDto);
    });
  });

  describe('findOne', () => {
    it('delegates to the service with the id', async () => {
      const cleaner = { id: 1 } as CleanerEntity;
      service.findById.mockResolvedValue(cleaner);

      await expect(controller.findOne(1)).resolves.toBe(cleaner);
      expect(service.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('updateStatus', () => {
    it('delegates to the service with the id and new status', async () => {
      const updated = {
        id: 1,
        status: CleanerStatus.VERIFIED,
      } as CleanerEntity;
      service.updateStatus.mockResolvedValue(updated);

      const result = await controller.updateStatus(1, {
        status: CleanerStatus.VERIFIED,
      });

      expect(service.updateStatus).toHaveBeenCalledWith(
        1,
        CleanerStatus.VERIFIED,
      );
      expect(result).toBe(updated);
    });
  });
});
