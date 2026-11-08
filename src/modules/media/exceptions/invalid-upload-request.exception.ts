import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class InvalidUploadRequestException extends BaseException {
  constructor() {
    super('INVALID_UPLOAD_REQUEST', HttpStatus.BAD_REQUEST);
  }
}
