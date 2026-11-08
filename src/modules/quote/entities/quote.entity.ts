import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampEntity } from 'src/common/entities';
import { SubmissionLanguage } from 'src/common/enums';
import { CleanerEntity } from 'src/modules/cleaner/entities';
import { KindOfClean, PreferredTiming } from '../enums';

@Entity('quotes')
export class QuoteEntity extends TimestampEntity {
  @Column({ type: 'enum', enum: KindOfClean, nullable: true })
  kindOfClean: KindOfClean | null;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column()
  area: string;

  @Column({ type: 'enum', enum: PreferredTiming, nullable: true })
  preferredTiming?: PreferredTiming | null;

  @Column({ type: 'text', nullable: true })
  message?: string | null;

  @Column({ default: false })
  consentAccepted: boolean;

  @Column({ type: 'enum', enum: SubmissionLanguage, nullable: true })
  language: SubmissionLanguage | null;

  @Column({ type: 'varchar', nullable: true })
  sourcePage: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  pageUrl?: string | null;

  @ManyToOne(() => CleanerEntity, { nullable: true })
  @JoinColumn({ name: 'assignedCleanerId' })
  assignedCleaner?: CleanerEntity | null;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt: Date | null;
}
