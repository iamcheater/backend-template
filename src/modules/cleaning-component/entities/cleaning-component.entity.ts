import { Entity } from 'typeorm';
import { TranslatedColumn } from 'src/common/decorators';
import { TimestampEntity } from 'src/common/entities';
import { TranslatedText, TranslatedTextPatch } from 'src/common/types';

@Entity('cleaning_components')
export class CleaningComponentEntity extends TimestampEntity {
  @TranslatedColumn()
  title: TranslatedText;

  @TranslatedColumn({ nullable: true })
  description: TranslatedTextPatch | null;
}
