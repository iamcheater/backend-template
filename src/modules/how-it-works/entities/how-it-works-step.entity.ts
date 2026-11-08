import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TranslatedColumn } from 'src/common/decorators';
import { TimestampEntity } from 'src/common/entities';
import { TranslatedText } from 'src/common/types';
import { MediaAssetEntity } from 'src/modules/media/entities';

@Entity('how_it_works_steps')
export class HowItWorksStepEntity extends TimestampEntity {
  @TranslatedColumn()
  title: TranslatedText;

  @TranslatedColumn()
  description: TranslatedText;

  @Column({ default: 0 })
  order: number;

  @Column({ nullable: true })
  mediaAssetId: number | null;

  @ManyToOne(() => MediaAssetEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'mediaAssetId' })
  mediaAsset: MediaAssetEntity | null;
}
