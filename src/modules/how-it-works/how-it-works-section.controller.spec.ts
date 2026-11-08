import { Test, TestingModule } from '@nestjs/testing';
import { UploadPurpose } from 'src/modules/media/enums';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { HowItWorksSectionController } from './how-it-works-section.controller';
import { HowItWorksSectionService } from './how-it-works-section.service';
import { HowItWorksResponseDto } from './dtos';
import { HowItWorksSectionEntity } from './entities';

describe('HowItWorksSectionController', () => {
  let controller: HowItWorksSectionController;
  let service: jest.Mocked<HowItWorksSectionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HowItWorksSectionController],
      providers: [
        {
          provide: HowItWorksSectionService,
          useValue: {
            findPublic: jest.fn(),
            findForAdmin: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(HowItWorksSectionController);
    service = module.get(HowItWorksSectionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findPublic', () => {
    it('delegates to the service with the request language and returns its result', async () => {
      const response = new HowItWorksResponseDto({
        mediaType: null,
        media: null,
        steps: [],
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
      const section = { id: 1 } as HowItWorksSectionEntity;
      service.findForAdmin.mockResolvedValue(section);

      await expect(controller.findForAdmin()).resolves.toBe(section);
    });
  });

  describe('update', () => {
    it('delegates to the service with the dto', async () => {
      const updated = {
        id: 1,
        mediaAssetId: 5,
      } as HowItWorksSectionEntity;
      service.update.mockResolvedValue(updated);

      const dto = {
        key: 'how-it-works-image/abc.webp',
        purpose: UploadPurpose.HOW_IT_WORKS_IMAGE,
      };
      const result = await controller.update(dto);

      expect(service.update).toHaveBeenCalledWith(dto);
      expect(result).toBe(updated);
    });
  });
});
