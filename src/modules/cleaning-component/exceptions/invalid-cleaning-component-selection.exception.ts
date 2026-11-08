import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class InvalidCleaningComponentSelectionException extends BaseException {
  constructor() {
    super('INVALID_CLEANING_COMPONENT_SELECTION', HttpStatus.BAD_REQUEST);
  }
}
