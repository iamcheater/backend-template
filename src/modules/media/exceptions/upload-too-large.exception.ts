import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class UploadTooLargeException extends BaseException {
  constructor(maxSizeMb: number) {
    super('UPLOAD_TOO_LARGE', HttpStatus.BAD_REQUEST, { maxSizeMb });
  }
}
