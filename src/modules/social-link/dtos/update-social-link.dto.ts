import { IsBoolean, IsOptional } from 'class-validator';
import { IsSocialLinkUrl } from '../validators';

export class UpdateSocialLinkDto {
  @IsOptional()
  @IsSocialLinkUrl()
  url?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
