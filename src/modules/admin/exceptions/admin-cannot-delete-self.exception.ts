import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class AdminCannotDeleteSelfException extends BaseException {
  constructor() {
    super('ADMIN_CANNOT_DELETE_SELF', HttpStatus.BAD_REQUEST);
  }
}
