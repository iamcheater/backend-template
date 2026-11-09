import { Column, Entity } from 'typeorm';
import { TranslatedColumn } from 'src/common/decorators';
import { SectionEntity } from 'src/common/entities';
import { TranslatedText, TranslatedTextPatch } from 'src/common/types';

@Entity('e2e_sections')
export class E2eSectionEntity extends SectionEntity {
  @TranslatedColumn()
  title: TranslatedText;

  @TranslatedColumn({ nullable: true })
  subtitle: TranslatedTextPatch | null;

  @Column({ name: 'cta_url', type: 'varchar', nullable: true })
  ctaUrl: string | null;
}

export const E2E_SECTION_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "e2e_sections" (
    "id" SERIAL PRIMARY KEY,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    "is_active" boolean NOT NULL DEFAULT true,
    "title" jsonb NOT NULL,
    "subtitle" jsonb,
    "cta_url" character varying
  )
`;
