import { Column, Entity } from 'typeorm';
import { TranslatedColumn } from 'src/common/decorators';
import { TimestampEntity } from 'src/common/entities';
import { TranslatedText } from 'src/common/types';

@Entity('cleaner_expectations')
export class CleanerExpectationEntity extends TimestampEntity {
  @TranslatedColumn()
  title: TranslatedText;

  @TranslatedColumn()
  description: TranslatedText;

  @Column({ default: 0 })
  order: number;
}
