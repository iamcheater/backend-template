import { Test, TestingModule } from '@nestjs/testing';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthResponseDto } from './dtos';

describe('AdminAuthController', () => {
  let controller: AdminAuthController;
  let service: jest.Mocked<AdminAuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [
        {
          provide: AdminAuthService,
          useValue: { login: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(AdminAuthController);
    service = module.get(AdminAuthService);
  });

  describe('login', () => {
    it('delegates to the service and returns its result', async () => {
      const response = new AdminAuthResponseDto('token');
      service.login.mockResolvedValue(response);

      const dto = { email: 'admin@example.com', password: 'secret' };
      await expect(controller.login(dto)).resolves.toBe(response);
      expect(service.login).toHaveBeenCalledWith(dto);
    });
  });
});
