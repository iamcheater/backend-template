import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class CleanerNotVerifiedException extends BaseException {
  constructor() {
    super('CLEANER_NOT_VERIFIED', HttpStatus.BAD_REQUEST);
  }
}
