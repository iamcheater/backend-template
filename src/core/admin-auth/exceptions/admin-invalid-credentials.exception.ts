import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class AdminInvalidCredentialsException extends BaseException {
  constructor() {
    super('INVALID_CREDENTIALS', HttpStatus.UNAUTHORIZED);
  }
}
