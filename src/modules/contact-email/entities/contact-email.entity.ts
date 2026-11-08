import { Column, Entity } from 'typeorm';
import { TimestampEntity } from 'src/common/entities';

@Entity('contact_emails')
export class ContactEmailEntity extends TimestampEntity {
  @Column({ unique: true })
  email: string;

  @Column({ default: true })
  isActive: boolean;
}
