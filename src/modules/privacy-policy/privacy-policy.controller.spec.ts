import { Test, TestingModule } from '@nestjs/testing';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { PrivacyPolicyController } from './privacy-policy.controller';
import { PrivacyPolicyService } from './privacy-policy.service';
import { PrivacyPolicyResponseDto } from './dtos';
import { PrivacyPolicyEntity } from './entities';

describe('PrivacyPolicyController', () => {
  let controller: PrivacyPolicyController;
  let service: jest.Mocked<PrivacyPolicyService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrivacyPolicyController],
      providers: [
        {
          provide: PrivacyPolicyService,
          useValue: {
            findPublic: jest.fn(),
            findForAdmin: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(PrivacyPolicyController);
    service = module.get(PrivacyPolicyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findPublic', () => {
    it('delegates to the service with the request language and returns its result', async () => {
      const response = new PrivacyPolicyResponseDto({
        content: '<p>Policy</p>',
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
      const policy = { id: 1 } as PrivacyPolicyEntity;
      service.findForAdmin.mockResolvedValue(policy);

      await expect(controller.findForAdmin()).resolves.toBe(policy);
    });
  });

  describe('update', () => {
    it('delegates to the service with the dto', async () => {
      const updated = {
        id: 1,
        content: { en: '<p>New</p>' },
      } as PrivacyPolicyEntity;
      service.update.mockResolvedValue(updated);

      const dto = { content: { en: '<p>New</p>' } };
      const result = await controller.update(dto);

      expect(service.update).toHaveBeenCalledWith(dto);
      expect(result).toBe(updated);
    });
  });
});
