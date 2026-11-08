import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class MediaNotFoundException extends BaseException {
  constructor() {
    super('MEDIA_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
