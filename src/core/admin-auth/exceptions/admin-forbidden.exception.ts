import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class AdminForbiddenException extends BaseException {
  constructor() {
    super('ADMIN_FORBIDDEN', HttpStatus.FORBIDDEN);
  }
}
