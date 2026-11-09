import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class SectionNotFoundException extends BaseException {
  constructor() {
    super('SECTION_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
