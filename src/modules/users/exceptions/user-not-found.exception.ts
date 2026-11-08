import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class UserNotFoundException extends BaseException {
  constructor() {
    super('USER_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
