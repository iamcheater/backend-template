import { SetMetadata } from '@nestjs/common';
import { AdminRole } from 'src/core/admin/enums';

export const ROLES_KEY = 'adminRoles';
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
