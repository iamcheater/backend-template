import { Column, Entity } from 'typeorm';
import { TimestampEntity } from 'src/common/entities';
import { SocialPlatform } from '../enums';

@Entity('social_links')
export class SocialLinkEntity extends TimestampEntity {
  @Column({ type: 'enum', enum: SocialPlatform, unique: true })
  platform: SocialPlatform;

  @Column({ type: 'varchar', nullable: true })
  url: string | null;

  @Column({ default: true })
  isActive: boolean;
}
