import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class ContactEmailNotFoundException extends BaseException {
  constructor() {
    super('CONTACT_EMAIL_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
