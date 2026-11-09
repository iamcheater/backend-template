import { AdminRole } from 'src/core/admin/enums';

export interface AdminJwtPayload {
  sub: number;
  email: string;
  role: AdminRole;
  type: 'admin';
}
