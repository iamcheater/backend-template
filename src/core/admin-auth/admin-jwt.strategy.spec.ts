import { ConfigService } from '@nestjs/config';
import { AdminService } from 'src/core/admin/admin.service';
import { AdminEntity } from 'src/core/admin/entities';
import { AdminRole } from 'src/core/admin/enums';
import { AdminNotFoundException } from 'src/core/admin/exceptions';
import { AdminJwtStrategy } from './admin-jwt.strategy';
import { AdminUnauthorizedException } from './exceptions';

describe('AdminJwtStrategy', () => {
  let strategy: AdminJwtStrategy;
  let adminService: jest.Mocked<AdminService>;

  const payload = {
    sub: 1,
    email: 'admin@example.com',
    role: AdminRole.ADMIN,
    type: 'admin' as const,
  };

  beforeEach(() => {
    adminService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<AdminService>;
    const configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;
    strategy = new AdminJwtStrategy(configService, adminService);
  });

  it('returns the freshly loaded admin for a valid admin token', async () => {
    const admin = { id: 1, role: AdminRole.ADMIN } as AdminEntity;
    adminService.findById.mockResolvedValue(admin);

    await expect(strategy.validate(payload)).resolves.toBe(admin);
    expect(adminService.findById).toHaveBeenCalledWith(1);
  });

  it('rejects a token whose type is not admin', async () => {
    await expect(
      strategy.validate({ ...payload, type: 'user' } as never),
    ).rejects.toThrow(AdminUnauthorizedException);
    expect(adminService.findById).not.toHaveBeenCalled();
  });

  it('rejects a token for an admin that no longer exists with 401, not 404', async () => {
    adminService.findById.mockRejectedValue(new AdminNotFoundException());

    await expect(strategy.validate(payload)).rejects.toThrow(
      AdminUnauthorizedException,
    );
  });
});
