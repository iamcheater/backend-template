import { MediaType, UploadPurpose } from '../enums';
import { UploadPurposeConfig } from '../interfaces';

export const UPLOAD_PURPOSES: Record<UploadPurpose, UploadPurposeConfig> = {
  [UploadPurpose.SERVICE_IMAGE]: {
    type: MediaType.IMAGE,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [UploadPurpose.SERVICE_VIDEO]: {
    type: MediaType.VIDEO,
    allowedMimeTypes: ['video/mp4'],
  },
  [UploadPurpose.HERO_IMAGE]: {
    type: MediaType.IMAGE,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [UploadPurpose.HERO_VIDEO]: {
    type: MediaType.VIDEO,
    allowedMimeTypes: ['video/mp4'],
  },
  [UploadPurpose.HOW_IT_WORKS_IMAGE]: {
    type: MediaType.IMAGE,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [UploadPurpose.HOW_IT_WORKS_VIDEO]: {
    type: MediaType.VIDEO,
    allowedMimeTypes: ['video/mp4'],
  },
  [UploadPurpose.STANDARDS_IMAGE]: {
    type: MediaType.IMAGE,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [UploadPurpose.STANDARDS_VIDEO]: {
    type: MediaType.VIDEO,
    allowedMimeTypes: ['video/mp4'],
  },
  [UploadPurpose.TALK_TO_US_IMAGE]: {
    type: MediaType.IMAGE,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [UploadPurpose.TALK_TO_US_VIDEO]: {
    type: MediaType.VIDEO,
    allowedMimeTypes: ['video/mp4'],
  },
  [UploadPurpose.FOR_CLEANERS_IMAGE]: {
    type: MediaType.IMAGE,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [UploadPurpose.FOR_CLEANERS_VIDEO]: {
    type: MediaType.VIDEO,
    allowedMimeTypes: ['video/mp4'],
  },
};
