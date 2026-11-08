import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class AdminUnauthorizedException extends BaseException {
  constructor() {
    super('UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
  }
}
