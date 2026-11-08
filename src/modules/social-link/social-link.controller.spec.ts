import { Test, TestingModule } from '@nestjs/testing';
import { SocialLinkController } from './social-link.controller';
import { SocialLinkService } from './social-link.service';
import { SocialLinkEntity } from './entities';
import { SocialPlatform } from './enums';

describe('SocialLinkController', () => {
  let controller: SocialLinkController;
  let service: jest.Mocked<SocialLinkService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SocialLinkController],
      providers: [
        {
          provide: SocialLinkService,
          useValue: {
            findAll: jest.fn(),
            findAllActive: jest.fn(),
            updateByPlatform: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(SocialLinkController);
    service = module.get(SocialLinkService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAllActive', () => {
    it('delegates to the service and returns its result', async () => {
      const links = [{ id: 1 }] as SocialLinkEntity[];
      service.findAllActive.mockResolvedValue(links);

      await expect(controller.findAllActive()).resolves.toBe(links);
    });
  });

  describe('findAll', () => {
    it('delegates to the service and returns its result', async () => {
      const links = [{ id: 1 }] as SocialLinkEntity[];
      service.findAll.mockResolvedValue(links);

      await expect(controller.findAll()).resolves.toBe(links);
    });
  });

  describe('update', () => {
    it('delegates to the service with the platform and dto', async () => {
      const updated = {
        platform: SocialPlatform.YOUTUBE,
        url: 'https://youtube.com/@jeenj',
      } as SocialLinkEntity;
      service.updateByPlatform.mockResolvedValue(updated);

      const result = await controller.update(SocialPlatform.YOUTUBE, {
        url: 'https://youtube.com/@jeenj',
      });

      expect(service.updateByPlatform).toHaveBeenCalledWith(
        SocialPlatform.YOUTUBE,
        { url: 'https://youtube.com/@jeenj' },
      );
      expect(result).toBe(updated);
    });
  });
});
