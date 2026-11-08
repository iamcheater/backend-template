import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AdminEntity } from '../entities';
import { AdminRole } from '../enums';
import { AdminForbiddenException } from '../exceptions';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const buildContext = (admin: Partial<AdminEntity>): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: admin }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const context = buildContext({ role: AdminRole.ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when the admin has one of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([AdminRole.SUPER_ADMIN]);

    const context = buildContext({ role: AdminRole.SUPER_ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access when the admin role is not among the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([AdminRole.SUPER_ADMIN]);

    const context = buildContext({ role: AdminRole.ADMIN });

    expect(() => guard.canActivate(context)).toThrow(AdminForbiddenException);
  });
});
