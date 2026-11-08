import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class ContactEmailAlreadyExistsException extends BaseException {
  constructor() {
    super('CONTACT_EMAIL_ALREADY_EXISTS', HttpStatus.CONFLICT);
  }
}
