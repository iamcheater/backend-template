import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class ServiceNotFoundException extends BaseException {
  constructor() {
    super('SERVICE_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
