import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampEntity } from 'src/common/entities';
import { MediaAssetEntity } from 'src/modules/media/entities';

@Entity('hero_slides')
export class HeroSlideEntity extends TimestampEntity {
  @Column({ default: 0 })
  order: number;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  mediaAssetId: number;

  @ManyToOne(() => MediaAssetEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'mediaAssetId' })
  mediaAsset: MediaAssetEntity;
}
