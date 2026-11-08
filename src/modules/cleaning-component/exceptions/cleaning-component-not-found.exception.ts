import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class CleaningComponentNotFoundException extends BaseException {
  constructor() {
    super('CLEANING_COMPONENT_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
