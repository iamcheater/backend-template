import { MediaType, UploadPurpose } from '../enums';
import { UploadPurposeConfig } from '../interfaces';

export const UPLOAD_PURPOSES: Record<UploadPurpose, UploadPurposeConfig> = {
  [UploadPurpose.EXAMPLE_IMAGE]: {
    type: MediaType.IMAGE,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [UploadPurpose.EXAMPLE_VIDEO]: {
    type: MediaType.VIDEO,
    allowedMimeTypes: ['video/mp4'],
  },
};
