import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class CleanerNotFoundException extends BaseException {
  constructor() {
    super('CLEANER_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
