import { Test, TestingModule } from '@nestjs/testing';
import { MediaType, UploadPurpose } from 'src/modules/media/enums';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import { ServiceResponseDto } from './dtos';
import { ServiceEntity } from './entities';

describe('ServiceController', () => {
  let controller: ServiceController;
  let service: jest.Mocked<ServiceService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceController],
      providers: [
        {
          provide: ServiceService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findAllActive: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ServiceController);
    service = module.get(ServiceService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAllActive', () => {
    it('delegates to the service and returns its result', async () => {
      const services = [
        new ServiceResponseDto({
          id: 1,
          title: 'Window Cleaning',
          description: 'Windows',
          order: 0,
          mediaType: MediaType.IMAGE,
          media: { url: 'https://signed-url' },
          components: [],
        }),
      ];
      service.findAllActive.mockResolvedValue(services);

      await expect(
        controller.findAllActive(SupportedLanguage.RU),
      ).resolves.toBe(services);
      expect(service.findAllActive).toHaveBeenCalledWith(SupportedLanguage.RU);
    });
  });

  describe('create', () => {
    it('delegates to the service and returns its result', async () => {
      const dto = {
        title: { en: 'Window Cleaning' },
        description: { en: 'Windows' },
        key: 'service-image/abc.webp',
        purpose: UploadPurpose.SERVICE_IMAGE,
      };
      const created = { id: 1, ...dto } as unknown as ServiceEntity;
      service.create.mockResolvedValue(created);

      await expect(controller.create(dto)).resolves.toBe(created);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('delegates to the service and returns its result', async () => {
      const services = [{ id: 1 }] as ServiceEntity[];
      service.findAll.mockResolvedValue(services);

      await expect(controller.findAll()).resolves.toBe(services);
    });
  });

  describe('findOne', () => {
    it('delegates to the service with the id', async () => {
      const found = { id: 1 } as ServiceEntity;
      service.findById.mockResolvedValue(found);

      await expect(controller.findOne(1)).resolves.toBe(found);
      expect(service.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('delegates to the service with the id and dto', async () => {
      const updated = { id: 1, isActive: false } as ServiceEntity;
      service.update.mockResolvedValue(updated);

      const result = await controller.update(1, { isActive: false });

      expect(service.update).toHaveBeenCalledWith(1, { isActive: false });
      expect(result).toBe(updated);
    });
  });
});
