import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class AdminIncorrectCurrentPasswordException extends BaseException {
  constructor() {
    super('ADMIN_INCORRECT_CURRENT_PASSWORD', HttpStatus.BAD_REQUEST);
  }
}
