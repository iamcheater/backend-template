import { Column, Entity } from 'typeorm';
import { TimestampEntity } from 'src/common/entities';
import { SubmissionLanguage } from 'src/common/enums';
import {
  Availability,
  CleanerSkill,
  CleanerStatus,
  CleaningExperience,
} from '../enums';

@Entity('cleaners')
export class CleanerEntity extends TimestampEntity {
  @Column()
  fullName: string;

  @Column()
  phone: string;

  @Column()
  cityArea: string;

  @Column({ type: 'enum', enum: CleaningExperience, nullable: true })
  cleaningExperience: CleaningExperience | null;

  @Column({ type: 'enum', enum: Availability, array: true, default: [] })
  availability: Availability[];

  @Column({ type: 'enum', enum: CleanerSkill, array: true, default: [] })
  servicesCanDo: CleanerSkill[];

  @Column()
  hasOwnSupplies: boolean;

  @Column({ type: 'text', nullable: true })
  message?: string | null;

  @Column({
    type: 'enum',
    enum: CleanerStatus,
    default: CleanerStatus.PENDING,
  })
  status: CleanerStatus;

  @Column({ default: false })
  consentAccepted: boolean;

  @Column({ type: 'enum', enum: SubmissionLanguage, nullable: true })
  language: SubmissionLanguage | null;

  @Column({ type: 'varchar', nullable: true })
  sourcePage: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  pageUrl?: string | null;
}
