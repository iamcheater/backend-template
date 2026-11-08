import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class AdminEmailAlreadyExistsException extends BaseException {
  constructor() {
    super('ADMIN_EMAIL_ALREADY_EXISTS', HttpStatus.CONFLICT);
  }
}
