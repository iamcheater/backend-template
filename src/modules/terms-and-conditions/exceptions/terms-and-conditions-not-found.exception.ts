import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class TermsAndConditionsNotFoundException extends BaseException {
  constructor() {
    super('TERMS_AND_CONDITIONS_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
