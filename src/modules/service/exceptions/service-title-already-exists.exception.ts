import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class ServiceTitleAlreadyExistsException extends BaseException {
  constructor() {
    super('SERVICE_TITLE_ALREADY_EXISTS', HttpStatus.CONFLICT);
  }
}
