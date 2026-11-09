import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DbHealthResponseDto, HealthResponseDto } from './dtos';
import { DatabaseUnavailableException } from './exceptions';

describe('HealthController', () => {
  let controller: HealthController;
  let service: jest.Mocked<HealthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: { check: jest.fn(), checkDb: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
    service = module.get(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('returns whatever the service reports', () => {
      const response: HealthResponseDto = {
        status: 'ok',
        uptime: 12.3,
        timestamp: '2026-01-01T00:00:00.000Z',
      };
      service.check.mockReturnValue(response);

      expect(controller.check()).toBe(response);
      expect(service.check).toHaveBeenCalled();
    });
  });

  describe('checkDb', () => {
    it('returns whatever the service reports', async () => {
      const response: DbHealthResponseDto = {
        status: 'ok',
        timestamp: '2026-01-01T00:00:00.000Z',
      };
      service.checkDb.mockResolvedValue(response);

      await expect(controller.checkDb()).resolves.toBe(response);
      expect(service.checkDb).toHaveBeenCalled();
    });

    it('propagates DatabaseUnavailableException from the service', async () => {
      service.checkDb.mockRejectedValue(new DatabaseUnavailableException());

      await expect(controller.checkDb()).rejects.toThrow(
        DatabaseUnavailableException,
      );
    });
  });
});
