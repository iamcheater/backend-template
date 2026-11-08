import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class ForCleanersNotFoundException extends BaseException {
  constructor() {
    super('FOR_CLEANERS_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
