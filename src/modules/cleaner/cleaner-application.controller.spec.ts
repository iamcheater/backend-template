import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionLanguage } from 'src/common/enums';
import { CleanerApplicationController } from './cleaner-application.controller';
import { CleanerService } from './cleaner.service';
import { CreateCleanerDto } from './dtos';
import {
  Availability,
  CleanerSkill,
  CleaningExperience,
  SuppliesAnswer,
} from './enums';

describe('CleanerApplicationController', () => {
  let controller: CleanerApplicationController;
  let service: jest.Mocked<CleanerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CleanerApplicationController],
      providers: [
        {
          provide: CleanerService,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(CleanerApplicationController);
    service = module.get(CleanerService);
  });

  it('delegates the application to the service and returns nothing', async () => {
    const dto: CreateCleanerDto = {
      fullName: 'Jane Cleaner',
      phone: '+374 55 123456',
      cityArea: 'Kentron',
      cleaningExperience: CleaningExperience.NONE,
      availability: [Availability.EVENINGS],
      servicesCanDo: [CleanerSkill.OFFICE],
      hasOwnSupplies: SuppliesAnswer.NO,
      consentAccepted: true,
      language: SubmissionLanguage.EN,
      sourcePage: 'for-cleaners',
    };
    service.create.mockResolvedValue(undefined);

    await expect(controller.create(dto)).resolves.toBeUndefined();
    expect(service.create).toHaveBeenCalledWith(dto);
  });
});
