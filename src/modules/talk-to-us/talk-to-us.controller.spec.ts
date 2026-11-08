import { Test, TestingModule } from '@nestjs/testing';
import { UploadPurpose } from 'src/modules/media/enums';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { TalkToUsController } from './talk-to-us.controller';
import { TalkToUsService } from './talk-to-us.service';
import { TalkToUsResponseDto } from './dtos';
import { TalkToUsSectionEntity } from './entities';

describe('TalkToUsController', () => {
  let controller: TalkToUsController;
  let service: jest.Mocked<TalkToUsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TalkToUsController],
      providers: [
        {
          provide: TalkToUsService,
          useValue: {
            findPublic: jest.fn(),
            findForAdmin: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(TalkToUsController);
    service = module.get(TalkToUsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findPublic', () => {
    it('delegates to the service with the request language and returns its result', async () => {
      const response = new TalkToUsResponseDto({
        title: 'Свяжитесь с нами',
        text: null,
        mediaType: null,
        media: null,
      });
      service.findPublic.mockResolvedValue(response);

      await expect(controller.findPublic(SupportedLanguage.RU)).resolves.toBe(
        response,
      );
      expect(service.findPublic).toHaveBeenCalledWith(SupportedLanguage.RU);
    });
  });

  describe('findForAdmin', () => {
    it('delegates to the service and returns its result', async () => {
      const section = { id: 1 } as TalkToUsSectionEntity;
      service.findForAdmin.mockResolvedValue(section);

      await expect(controller.findForAdmin()).resolves.toBe(section);
    });
  });

  describe('update', () => {
    it('delegates to the service with the dto', async () => {
      const updated = {
        id: 1,
        title: { en: 'Talk to us' },
        mediaAssetId: 5,
      } as TalkToUsSectionEntity;
      service.update.mockResolvedValue(updated);

      const dto = {
        title: { en: 'Talk to us' },
        key: 'talk-to-us-image/abc.webp',
        purpose: UploadPurpose.TALK_TO_US_IMAGE,
      };
      const result = await controller.update(dto);

      expect(service.update).toHaveBeenCalledWith(dto);
      expect(result).toBe(updated);
    });
  });
});
