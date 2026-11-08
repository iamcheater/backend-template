import { Test, TestingModule } from '@nestjs/testing';
import { HowItWorksStepController } from './how-it-works-step.controller';
import { HowItWorksStepService } from './how-it-works-step.service';
import { HowItWorksStepEntity } from './entities';

describe('HowItWorksStepController', () => {
  let controller: HowItWorksStepController;
  let service: jest.Mocked<HowItWorksStepService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HowItWorksStepController],
      providers: [
        {
          provide: HowItWorksStepService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(HowItWorksStepController);
    service = module.get(HowItWorksStepService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates to the service and returns its result', async () => {
      const dto = {
        title: { en: 'Sign up', hy: 'Գրանցվել' },
        description: { en: 'Create an account' },
      };
      const created = { id: 1, ...dto } as HowItWorksStepEntity;
      service.create.mockResolvedValue(created);

      await expect(controller.create(dto)).resolves.toBe(created);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('delegates to the service and returns its result', async () => {
      const steps = [{ id: 1 }] as HowItWorksStepEntity[];
      service.findAll.mockResolvedValue(steps);

      await expect(controller.findAll()).resolves.toBe(steps);
    });
  });

  describe('update', () => {
    it('delegates to the service with the id and dto', async () => {
      const updated = {
        id: 1,
        title: { en: 'New' },
        order: 2,
      } as HowItWorksStepEntity;
      service.update.mockResolvedValue(updated);

      const dto = { title: { en: 'New' }, order: 2 };
      const result = await controller.update(1, dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
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
