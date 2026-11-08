import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class QuoteNotFoundException extends BaseException {
  constructor() {
    super('QUOTE_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
