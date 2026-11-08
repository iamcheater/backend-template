import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class HowItWorksSectionNotFoundException extends BaseException {
  constructor() {
    super('HOW_IT_WORKS_SECTION_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
