import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class DatabaseUnavailableException extends BaseException {
  constructor() {
    super('DATABASE_UNAVAILABLE', HttpStatus.SERVICE_UNAVAILABLE);
  }
}
