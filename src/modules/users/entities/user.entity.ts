import { Column, Entity } from 'typeorm';
import { TimestampEntity } from 'src/common/entities';

@Entity('users')
export class UserEntity extends TimestampEntity {
  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;
}
