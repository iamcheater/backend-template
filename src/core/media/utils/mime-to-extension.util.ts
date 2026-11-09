const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
};

export const mimeToExtension = (mimeType: string): string | undefined =>
  MIME_TO_EXTENSION[mimeType];

export const describeMimeTypes = (mimeTypes: string[]): string =>
  mimeTypes
    .map((mimeType) => mimeToExtension(mimeType)?.toUpperCase() ?? mimeType)
    .join(', ');
