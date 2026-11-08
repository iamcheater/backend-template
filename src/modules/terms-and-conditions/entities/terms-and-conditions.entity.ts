import { Entity } from 'typeorm';
import { TranslatedColumn } from 'src/common/decorators';
import { TimestampEntity } from 'src/common/entities';
import { TranslatedTextPatch } from 'src/common/types';

@Entity('terms_and_conditions')
export class TermsAndConditionsEntity extends TimestampEntity {
  @TranslatedColumn({ nullable: true })
  content: TranslatedTextPatch | null;
}
