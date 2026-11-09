import { Column } from 'typeorm';
import { TimestampEntity } from './timestamp.entity';

export abstract class SectionEntity extends TimestampEntity {
  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
