import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class ContactPhoneAlreadyExistsException extends BaseException {
  constructor() {
    super('CONTACT_PHONE_ALREADY_EXISTS', HttpStatus.CONFLICT);
  }
}
