import { Test, TestingModule } from '@nestjs/testing';
import { MediaType, UploadPurpose } from 'src/modules/media/enums';
import { HeroSectionController } from './hero-section.controller';
import { HeroSectionService } from './hero-section.service';
import { HeroSlideEntity } from './entities';
import { HeroSlideResponseDto } from './dtos';

describe('HeroSectionController', () => {
  let controller: HeroSectionController;
  let service: jest.Mocked<HeroSectionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HeroSectionController],
      providers: [
        {
          provide: HeroSectionService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findAllPublic: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(HeroSectionController);
    service = module.get(HeroSectionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAllPublic', () => {
    it('delegates to the service and returns its result', async () => {
      const slides = [
        new HeroSlideResponseDto({
          id: 1,
          order: 0,
          mediaType: MediaType.IMAGE,
          media: { url: 'https://signed-url' },
        }),
      ];
      service.findAllPublic.mockResolvedValue(slides);

      await expect(controller.findAllPublic()).resolves.toBe(slides);
    });
  });

  describe('create', () => {
    it('delegates to the service and returns its result', async () => {
      const dto = {
        key: 'hero-image/abc.webp',
        purpose: UploadPurpose.HERO_IMAGE,
      };
      const created = { id: 1 } as HeroSlideEntity;
      service.create.mockResolvedValue(created);

      await expect(controller.create(dto)).resolves.toBe(created);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('delegates to the service and returns its result', async () => {
      const slides = [{ id: 1 }] as HeroSlideEntity[];
      service.findAll.mockResolvedValue(slides);

      await expect(controller.findAll()).resolves.toBe(slides);
    });
  });

  describe('update', () => {
    it('delegates to the service with the id and dto', async () => {
      const updated = { id: 1, order: 2 } as HeroSlideEntity;
      service.update.mockResolvedValue(updated);

      const result = await controller.update(1, { order: 2 });

      expect(service.update).toHaveBeenCalledWith(1, { order: 2 });
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
