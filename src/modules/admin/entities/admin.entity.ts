import { Column, Entity } from 'typeorm';
import { TimestampEntity } from 'src/common/entities';
import { AdminRole } from '../enums';

@Entity('admins')
export class AdminEntity extends TimestampEntity {
  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ type: 'enum', enum: AdminRole, default: AdminRole.ADMIN })
  role: AdminRole;
}
