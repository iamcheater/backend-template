import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TranslatedColumn } from 'src/common/decorators';
import { TimestampEntity } from 'src/common/entities';
import { TranslatedTextPatch } from 'src/common/types';
import { MediaAssetEntity } from 'src/modules/media/entities';

@Entity('standards_section')
export class StandardsSectionEntity extends TimestampEntity {
  @TranslatedColumn({ nullable: true })
  text: TranslatedTextPatch | null;

  @Column({ nullable: true })
  mediaAssetId: number | null;

  @ManyToOne(() => MediaAssetEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'mediaAssetId' })
  mediaAsset: MediaAssetEntity | null;
}
