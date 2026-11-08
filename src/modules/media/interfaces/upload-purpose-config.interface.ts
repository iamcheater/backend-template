import { MediaType } from '../enums';

export interface UploadPurposeConfig {
  type: MediaType;
  allowedMimeTypes: string[];
}
