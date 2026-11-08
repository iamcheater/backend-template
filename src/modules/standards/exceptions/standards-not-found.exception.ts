import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class StandardsNotFoundException extends BaseException {
  constructor() {
    super('STANDARDS_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
