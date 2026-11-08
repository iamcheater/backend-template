import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TranslatedColumn } from 'src/common/decorators';
import { TimestampEntity } from 'src/common/entities';
import { TranslatedTextPatch } from 'src/common/types';
import { MediaAssetEntity } from 'src/modules/media/entities';

@Entity('for_cleaners_section')
export class ForCleanersSectionEntity extends TimestampEntity {
  @TranslatedColumn({ nullable: true })
  title: TranslatedTextPatch | null;

  @TranslatedColumn({ nullable: true })
  description: TranslatedTextPatch | null;

  @Column({ nullable: true })
  mediaAssetId: number | null;

  @ManyToOne(() => MediaAssetEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'mediaAssetId' })
  mediaAsset: MediaAssetEntity | null;
}
