import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class UnsupportedUploadTypeException extends BaseException {
  constructor(allowedFormats: string) {
    super('UNSUPPORTED_UPLOAD_TYPE', HttpStatus.BAD_REQUEST, {
      formats: allowedFormats,
    });
  }
}
