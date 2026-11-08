import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class ContactPhoneNotFoundException extends BaseException {
  constructor() {
    super('CONTACT_PHONE_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
