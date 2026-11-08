import { Column, Entity } from 'typeorm';
import { TimestampEntity } from 'src/common/entities';
import { MediaStatus, MediaType } from '../enums';

@Entity('media_assets')
export class MediaAssetEntity extends TimestampEntity {
  @Column({ type: 'enum', enum: MediaType })
  type: MediaType;

  @Column({ type: 'enum', enum: MediaStatus, default: MediaStatus.PENDING })
  status: MediaStatus;

  @Column()
  key: string;

  @Column({ type: 'jsonb', nullable: true })
  variants: Record<string, string> | null;
}
