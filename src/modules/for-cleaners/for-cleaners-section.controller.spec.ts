import { Test, TestingModule } from '@nestjs/testing';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { UploadPurpose } from 'src/modules/media/enums';
import { ForCleanersSectionController } from './for-cleaners-section.controller';
import { ForCleanersSectionService } from './for-cleaners-section.service';
import { ForCleanersResponseDto } from './dtos';
import { ForCleanersSectionEntity } from './entities';

describe('ForCleanersSectionController', () => {
  let controller: ForCleanersSectionController;
  let service: jest.Mocked<ForCleanersSectionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ForCleanersSectionController],
      providers: [
        {
          provide: ForCleanersSectionService,
          useValue: {
            findPublic: jest.fn(),
            findForAdmin: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ForCleanersSectionController);
    service = module.get(ForCleanersSectionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findPublic', () => {
    it('delegates to the service with the request language', async () => {
      const response = new ForCleanersResponseDto({
        title: null,
        description: null,
        mediaType: null,
        media: null,
        expectations: [],
      });
      service.findPublic.mockResolvedValue(response);

      await expect(controller.findPublic(SupportedLanguage.HY)).resolves.toBe(
        response,
      );
      expect(service.findPublic).toHaveBeenCalledWith(SupportedLanguage.HY);
    });
  });

  describe('findForAdmin', () => {
    it('delegates to the service and returns its result', async () => {
      const section = { id: 1 } as ForCleanersSectionEntity;
      service.findForAdmin.mockResolvedValue(section);

      await expect(controller.findForAdmin()).resolves.toBe(section);
    });
  });

  describe('update', () => {
    it('delegates to the service with the dto', async () => {
      const updated = {
        id: 1,
        mediaAssetId: 5,
      } as ForCleanersSectionEntity;
      service.update.mockResolvedValue(updated);

      const dto = {
        title: { en: 'For Cleaners', ru: 'Для клинеров' },
        key: 'for-cleaners-image/abc.webp',
        purpose: UploadPurpose.FOR_CLEANERS_IMAGE,
      };
      const result = await controller.update(dto);

      expect(service.update).toHaveBeenCalledWith(dto);
      expect(result).toBe(updated);
    });
  });
});
