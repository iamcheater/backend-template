import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
} from 'typeorm';
import { TranslatedColumn } from 'src/common/decorators';
import { TimestampEntity } from 'src/common/entities';
import { TranslatedText } from 'src/common/types';
import { CleaningComponentEntity } from 'src/modules/cleaning-component/entities';
import { MediaAssetEntity } from 'src/modules/media/entities';

@Entity('services')
export class ServiceEntity extends TimestampEntity {
  @TranslatedColumn()
  title: TranslatedText;

  @TranslatedColumn()
  description: TranslatedText;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  order: number;

  @Column()
  mediaAssetId: number;

  @ManyToOne(() => MediaAssetEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'mediaAssetId' })
  mediaAsset: MediaAssetEntity;

  @ManyToMany(() => CleaningComponentEntity, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'services_cleaning_components',
    joinColumn: { name: 'serviceId' },
    inverseJoinColumn: { name: 'cleaningComponentId' },
  })
  cleaningComponents: CleaningComponentEntity[];
}
