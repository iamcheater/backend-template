import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class TooManyRequestsException extends BaseException {
  constructor() {
    super('TOO_MANY_REQUESTS', HttpStatus.TOO_MANY_REQUESTS);
  }
}
