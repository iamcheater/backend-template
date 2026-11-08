import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class CleanerExpectationNotFoundException extends BaseException {
  constructor() {
    super('CLEANER_EXPECTATION_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
