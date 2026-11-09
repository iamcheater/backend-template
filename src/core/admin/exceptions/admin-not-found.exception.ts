import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class AdminNotFoundException extends BaseException {
  constructor() {
    super('ADMIN_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
