import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class HowItWorksStepNotFoundException extends BaseException {
  constructor() {
    super('HOW_IT_WORKS_STEP_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
