import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampEntity } from 'src/common/entities';
import { MediaAssetEntity } from 'src/modules/media/entities';

@Entity('how_it_works_section')
export class HowItWorksSectionEntity extends TimestampEntity {
  @Column({ nullable: true })
  mediaAssetId: number | null;

  @ManyToOne(() => MediaAssetEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'mediaAssetId' })
  mediaAsset: MediaAssetEntity | null;
}
