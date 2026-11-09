import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AdminService } from 'src/core/admin/admin.service';
import { AdminEntity } from 'src/core/admin/entities';
import { AdminRole } from 'src/core/admin/enums';
import { AdminAuthService } from './admin-auth.service';
import { AdminInvalidCredentialsException } from './exceptions';

jest.mock('bcrypt');

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let adminService: jest.Mocked<AdminService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        {
          provide: AdminService,
          useValue: { findByEmailWithPassword: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AdminAuthService);
    adminService = module.get(AdminService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('throws AdminInvalidCredentialsException when no admin matches the email', async () => {
      adminService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'secret' }),
      ).rejects.toThrow(AdminInvalidCredentialsException);
    });

    it('throws AdminInvalidCredentialsException when the password does not match', async () => {
      adminService.findByEmailWithPassword.mockResolvedValue({
        id: 1,
        email: 'admin@example.com',
        password: 'hashed',
        role: AdminRole.ADMIN,
      } as AdminEntity);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'admin@example.com', password: 'wrong' }),
      ).rejects.toThrow(AdminInvalidCredentialsException);
    });

    it('returns a signed access token on valid credentials', async () => {
      adminService.findByEmailWithPassword.mockResolvedValue({
        id: 1,
        email: 'admin@example.com',
        password: 'hashed',
        role: AdminRole.SUPER_ADMIN,
      } as AdminEntity);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('signed-token');

      const result = await service.login({
        email: 'admin@example.com',
        password: 'correct',
      });

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 1,
        email: 'admin@example.com',
        role: AdminRole.SUPER_ADMIN,
        type: 'admin',
      });
      expect(result.accessToken).toBe('signed-token');
    });
  });
});
