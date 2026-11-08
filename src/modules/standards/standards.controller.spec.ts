import { Test, TestingModule } from '@nestjs/testing';
import { UploadPurpose } from 'src/modules/media/enums';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { StandardsController } from './standards.controller';
import { StandardsService } from './standards.service';
import { StandardsResponseDto } from './dtos';
import { StandardsSectionEntity } from './entities';

describe('StandardsController', () => {
  let controller: StandardsController;
  let service: jest.Mocked<StandardsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StandardsController],
      providers: [
        {
          provide: StandardsService,
          useValue: {
            findPublic: jest.fn(),
            findForAdmin: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(StandardsController);
    service = module.get(StandardsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findPublic', () => {
    it('delegates to the service with the request language and returns its result', async () => {
      const response = new StandardsResponseDto({
        text: 'Չափանիշներ',
        mediaType: null,
        media: null,
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
      const section = { id: 1 } as StandardsSectionEntity;
      service.findForAdmin.mockResolvedValue(section);

      await expect(controller.findForAdmin()).resolves.toBe(section);
    });
  });

  describe('update', () => {
    it('delegates to the service with the dto', async () => {
      const updated = {
        id: 1,
        text: { en: 'Standards' },
        mediaAssetId: 5,
      } as StandardsSectionEntity;
      service.update.mockResolvedValue(updated);

      const dto = {
        text: { en: 'Standards' },
        key: 'standards-image/abc.webp',
        purpose: UploadPurpose.STANDARDS_IMAGE,
      };
      const result = await controller.update(dto);

      expect(service.update).toHaveBeenCalledWith(dto);
      expect(result).toBe(updated);
    });
  });
});
