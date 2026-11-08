import { Entity } from 'typeorm';
import { TranslatedColumn } from 'src/common/decorators';
import { TimestampEntity } from 'src/common/entities';
import { TranslatedTextPatch } from 'src/common/types';

@Entity('privacy_policy')
export class PrivacyPolicyEntity extends TimestampEntity {
  @TranslatedColumn({ nullable: true })
  content: TranslatedTextPatch | null;
}
