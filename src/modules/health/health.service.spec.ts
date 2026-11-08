import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { HealthService } from './health.service';
import { DatabaseUnavailableException } from './exceptions';

describe('HealthService', () => {
  let service: HealthService;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: DataSource,
          useValue: { query: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(HealthService);
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('check', () => {
    it('returns an ok status with uptime and an ISO timestamp', () => {
      const result = service.check();

      expect(result.status).toBe('ok');
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('checkDb', () => {
    it('returns an ok status when the database responds', async () => {
      dataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result = await service.checkDb();

      expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
      expect(result.status).toBe('ok');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('throws DatabaseUnavailableException when the query fails', async () => {
      dataSource.query.mockRejectedValue(new Error('connection refused'));

      await expect(service.checkDb()).rejects.toThrow(
        DatabaseUnavailableException,
      );
    });
  });
});
