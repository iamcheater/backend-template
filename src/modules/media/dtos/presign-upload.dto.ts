import { IsEnum, IsInt, IsString, Min } from 'class-validator';
import { UploadPurpose } from '../enums';

export class PresignUploadDto {
  @IsEnum(UploadPurpose)
  purpose: UploadPurpose;

  @IsString()
  contentType: string;

  @IsInt()
  @Min(1)
  fileSize: number;
}
