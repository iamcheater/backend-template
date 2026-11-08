import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { UploadPurpose } from 'src/modules/media/enums';
import { HERO_UPLOAD_PURPOSES } from '../utils';

export class CreateHeroSlideDto {
  @IsString()
  key: string;

  @IsIn(HERO_UPLOAD_PURPOSES)
  purpose: UploadPurpose;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
