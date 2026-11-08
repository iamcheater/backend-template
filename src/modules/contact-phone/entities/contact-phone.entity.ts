import { Column, Entity } from 'typeorm';
import { TimestampEntity } from 'src/common/entities';

@Entity('contact_phones')
export class ContactPhoneEntity extends TimestampEntity {
  @Column({ unique: true })
  phone: string;

  @Column({ default: true })
  isActive: boolean;
}
