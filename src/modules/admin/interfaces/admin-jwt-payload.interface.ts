import { AdminRole } from '../enums';

export interface AdminJwtPayload {
  sub: number;
  email: string;
  role: AdminRole;
  type: 'admin';
}
