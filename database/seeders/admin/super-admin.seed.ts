import * as bcrypt from 'bcrypt';
import { AdminService } from '../../../src/core/admin/admin.service';
import { AdminRole } from '../../../src/core/admin/enums';

export async function seedSuperAdmin(
  adminService: AdminService,
): Promise<void> {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    if (await adminService.hasAdminWithRole(AdminRole.SUPER_ADMIN)) {
      console.log('Already seeded: super_admin');
      return;
    }

    throw new Error(
      'SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set to seed the super admin',
    );
  }

  const existing = await adminService.findByEmail(email);

  if (existing) {
    console.log('Already seeded: super_admin');
    return;
  }

  await adminService.create({
    email,
    password: await bcrypt.hash(password, 10),
    role: AdminRole.SUPER_ADMIN,
  });

  console.log('Successfully seeded: super_admin');
}
