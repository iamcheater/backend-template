import { Test, TestingModule } from '@nestjs/testing';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { TermsAndConditionsController } from './terms-and-conditions.controller';
import { TermsAndConditionsService } from './terms-and-conditions.service';
import { TermsAndConditionsResponseDto } from './dtos';
import { TermsAndConditionsEntity } from './entities';

describe('TermsAndConditionsController', () => {
  let controller: TermsAndConditionsController;
  let service: jest.Mocked<TermsAndConditionsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TermsAndConditionsController],
      providers: [
        {
          provide: TermsAndConditionsService,
          useValue: {
            findPublic: jest.fn(),
            findForAdmin: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(TermsAndConditionsController);
    service = module.get(TermsAndConditionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findPublic', () => {
    it('delegates to the service with the request language and returns its result', async () => {
      const response = new TermsAndConditionsResponseDto({
        content: '<p>Terms</p>',
        updatedAt: new Date('2026-09-01T00:00:00Z'),
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
      const terms = { id: 1 } as TermsAndConditionsEntity;
      service.findForAdmin.mockResolvedValue(terms);

      await expect(controller.findForAdmin()).resolves.toBe(terms);
    });
  });

  describe('update', () => {
    it('delegates to the service with the dto', async () => {
      const updated = {
        id: 1,
        content: { en: '<p>New</p>' },
      } as TermsAndConditionsEntity;
      service.update.mockResolvedValue(updated);

      const dto = { content: { en: '<p>New</p>' } };
      const result = await controller.update(dto);

      expect(service.update).toHaveBeenCalledWith(dto);
      expect(result).toBe(updated);
    });
  });
});
